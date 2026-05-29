import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { getToken } from "../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

// ─── Helpers ────────────────────────────────────────────────
const fmt = (v) => (v ?? "—");
const fmtDate = (v) => {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const STATUS_STYLES = {
  PENDING:               "bg-amber-50 text-amber-700 border-amber-200",
  PAYMENT_PENDING:       "bg-orange-50 text-orange-700 border-orange-200",
  PAID:                  "bg-emerald-50 text-emerald-700 border-emerald-200",
  ANSWER_SHEET_UPLOADED: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED:             "bg-teal-50 text-teal-700 border-teal-200",
  REJECTED:              "bg-red-50 text-red-700 border-red-200",
};

// ─── Detail Section Component ────────────────────────────────
const Section = ({ title, icon, children }) => (
  <div className="mb-6">
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
      <span className="text-slate-400 text-base">{icon}</span>
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</h3>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">{children}</div>
  </div>
);

const Field = ({ label, value, full = false }) => (
  <div className={full ? "col-span-1 sm:col-span-2" : "col-span-1"}>
    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
    <p className="text-sm font-medium text-slate-800 leading-snug break-words">{fmt(value)}</p>
  </div>
);

// ─── Modal ──────────────────────────────────────────────────
const DetailModal = ({ item, onClose, onUpload, onViewScript, uploading }) => {
  const fileRef = useRef(null);
  const enrollment = item?.student?.enrollments?.[0];
  const classSection = enrollment?.classSection;
  const academicYear = enrollment?.academicYear;
  const personalInfo = item?.student?.personalInfo;
  const parent = item?.parent;
  const marks = item?.marks;

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-3xl h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 transition-all duration-300"
        style={{ boxShadow: "0 32px 80px rgba(15,23,42,0.18)" }}
      >
        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="min-w-0 pr-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
              Re-Evaluation Request Details
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
              ID: <span className="font-mono text-slate-700">{item?.id}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Status Bar ── */}
        <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 py-2.5 bg-white border-b border-slate-100 flex-shrink-0">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold border ${STATUS_STYLES[item?.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            {item?.status?.replace(/_/g, " ")}
          </span>
          {item?.isPaid ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Fee Paid
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold border bg-red-50 text-red-700 border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Fee Pending
            </span>
          )}
          <span className="ml-auto text-[11px] text-slate-400 font-medium">
            {fmtDate(item?.createdAt)}
          </span>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 bg-white">

          {/* ── Student Information ── */}
          <Section title="Student Information" icon="🎓">
            <Field label="Full Name" value={`${item?.student?.name ?? ""}`} />
            <Field label="Student Code" value={item?.student?.studentCode} />
            <Field label="Admission Number" value={enrollment?.admissionNumber} />
            <Field label="Roll Number" value={enrollment?.rollNumber} />
            <Field label="Class" value={classSection?.grade} />
            <Field label="Section" value={classSection?.section ?? classSection?.name} />
            <Field label="Academic Year" value={academicYear?.name} />
            <Field label="Email" value={item?.student?.email} />
            <Field label="Phone" value={personalInfo?.phone} />
            <Field label="Gender" value={personalInfo?.gender} />
            <Field label="Date of Birth" value={fmtDate(personalInfo?.dateOfBirth)} />
            <Field label="Aadhaar Number" value={personalInfo?.aadhaarNumber} />
            <Field label="Address" value={personalInfo?.address} full />
            <Field label="City" value={personalInfo?.city} />
            <Field label="State" value={personalInfo?.state} />
          </Section>

          {/* ── Parent / Guardian Information ── */}
          <Section title="Parent / Guardian" icon="👤">
            <Field label="Name" value={parent?.name} />
            <Field label="Email" value={parent?.email} />
            <Field label="Phone" value={parent?.phone} />
            <Field label="Occupation" value={parent?.occupation} />
          </Section>

          {/* ── Exam & Request Information ── */}
          <Section title="Exam & Request Details" icon="📋">
            <Field label="Subject" value={item?.subject?.name} />
            <Field label="Assessment Group" value={item?.assessmentGroup?.name} />
            <Field label="Marks Obtained" value={marks?.marksObtained != null ? `${marks.marksObtained}` : "—"} />
            <Field label="Is Absent" value={marks?.isAbsent ? "Yes" : "No"} />
            <Field label="Requested Amount" value={item?.requestedAmount != null ? `₹ ${item.requestedAmount}` : "—"} />
            <Field label="Payment Status" value={item?.isPaid ? "Paid" : "Pending"} />
            <Field label="Request Status" value={item?.status?.replace(/_/g, " ")} />
            <Field label="Parent Remarks" value={item?.parentRemarks} full />
            <Field label="Admin Remarks" value={item?.adminRemarks} full />
          </Section>

          {/* ── Answer Script Actions ── */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <span className="text-slate-400 text-base">📄</span>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Answer Script</h3>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {item?.answerSheetFileKey ? (
                <>
                  <button
                    onClick={() => onViewScript(item.id)}
                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all shadow-sm focus:outline-none"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    View Script
                  </button>
                  <label className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer dynamic-input">
                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {uploading ? "Uploading…" : "Re-upload Script"}
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => onUpload(item.id, e.target.files[0])}
                      className="sr-only"
                      disabled={uploading}
                    />
                  </label>
                </>
              ) : (
                <label className="inline-flex items-center justify-center gap-2 bg-white border border-dashed border-slate-300 hover:bg-slate-50 hover:border-blue-400 text-slate-600 px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer dynamic-input w-full">
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {uploading ? "Uploading…" : "Upload Answer Script"}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => onUpload(item.id, e.target.files[0])}
                    className="sr-only"
                    disabled={uploading}
                  />
                </label>
              )}
              {uploading && (
                <span className="flex items-center justify-center gap-1.5 text-xs text-blue-600 font-semibold animate-pulse py-1">
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Uploading file…
                </span>
              )}
            </div>
            {item?.answerSheetUploadedAt && (
              <p className="text-[11px] text-slate-400 mt-2">
                Last uploaded: {fmtDate(item.answerSheetUploadedAt)}
              </p>
            )}
          </div>
        </div>

        {/* ── Modal Footer ── */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-all shadow-sm focus:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────
const ScriptViewRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setIsRefreshing(true);
      const response = await axios.get(`${API_URL}/api/re-evaluation/requests`, {
        headers: authHeaders(),
      });
      setRequests(response.data?.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const updatePayment = async (id, value) => {
    try {
      await axios.patch(
        `${API_URL}/api/re-evaluation/requests/${id}/payment`,
        { isPaid: value },
        { headers: authHeaders() }
      );
      fetchRequests();
    } catch (error) {
      console.error(error);
    }
  };

  const uploadAnswerSheet = async (id, file) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      setLoading(true);
      await axios.post(
        `${API_URL}/api/re-evaluation/requests/${id}/upload-answer-sheet`,
        formData,
        {
          headers: {
            ...authHeaders(),
            "Content-Type": "multipart/form-data",
          },
        }
      );
      alert("Answer script uploaded successfully");
      setSelectedItem((prev) =>
        prev?.id === id ? { ...prev, answerSheetFileKey: "pending-refresh", answerSheetUploadedAt: new Date().toISOString(), status: "ANSWER_SHEET_UPLOADED" } : prev
      );
      fetchRequests();
    } catch (error) {
      console.error(error);
      alert("Failed to upload file");
    } finally {
      setLoading(false);
    }
  };

  const openAnswerSheet = async (id) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/re-evaluation/requests/${id}/answer-sheet`,
        { headers: authHeaders() }
      );
      window.open(response.data.url, "_blank");
    } catch (error) {
      console.error(error);
    }
  };

  const getEnrollment = (item) => item?.student?.enrollments?.[0];
  const getClassName = (item) => {
    const e = getEnrollment(item);
    if (!e?.classSection) return "—";
    const cs = e.classSection;
    return [cs.grade, cs.section ?? cs.name].filter(Boolean).join(" – ");
  };

  return (
    <div className="min-h-screen bg-[#edf3f9] text-[#1e293b] p-4 md:p-8 space-y-6 md:space-y-8 font-sans antialiased">

      {/* ── Page Header ── */}
      <div className="pb-4 border-b border-[#cfdbe6] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0f172a]">
            Answer Sheets Requests
          </h1>
          <p className="text-xs md:text-sm text-[#64748b] mt-1">
            Review submissions, approve payments, and dispatch digital answer scripts
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 px-4 py-2 rounded-xl text-xs font-bold animate-pulse self-start sm:self-center">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            Syncing Document Changes…
          </div>
        )}
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_8px_30px_rgb(0,0,0,0.01)] overflow-hidden">
        <div className="p-4 md:p-6 border-b border-[#f1f5f9] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg md:text-xl font-bold text-[#0f172a]">Incoming Submission Streams</h2>
          <button
            onClick={fetchRequests}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-2 bg-white border border-[#e2e8f0] hover:bg-[#f8fafc] text-[#475569] px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 w-full sm:w-auto"
            title="Refresh stream list"
          >
            <svg
              className={`w-3.5 h-3.5 text-[#64748b] ${isRefreshing ? "animate-spin" : ""}`}
              fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Outer Horizontal Scrolling Engine */}
        <div className="overflow-x-auto w-full block visual-scroll">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-[#f8fafc] text-[#64748b] text-xs font-semibold uppercase tracking-wider border-b border-[#e2e8f0]">
                <th className="p-4 whitespace-nowrap">Student Profile</th>
                <th className="p-4 whitespace-nowrap">Class</th>
                <th className="p-4 whitespace-nowrap">Subject Block</th>
                <th className="p-4 whitespace-nowrap">Current Marks</th>
                <th className="p-4 whitespace-nowrap">Viewing Fee</th>
                <th className="p-4 whitespace-nowrap">Payment Toggle</th>
                <th className="p-4 whitespace-nowrap">Request Status</th>
                <th className="p-4 text-center whitespace-nowrap">Script Upload</th>
                <th className="p-4 text-center whitespace-nowrap">View Script</th>
                <th className="p-4 text-center whitespace-nowrap">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9] text-sm font-medium text-[#334155]">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-[#94a3b8] font-normal">
                    No re-evaluation requests found.
                  </td>
                </tr>
              ) : (
                requests.map((item) => (
                  <tr key={item.id} className="hover:bg-[#f8fafc]/40 transition-colors">

                    {/* STUDENT PROFILE */}
                    <td className="p-4">
                      <p className="font-semibold text-[#0f172a] leading-tight break-words max-w-[180px]">{item.student?.name ?? "—"}</p>
                      <p className="text-[11px] text-[#94a3b8] font-normal mt-0.5 whitespace-nowrap">
                        {item.student?.studentCode ?? "No code"} &middot; {getEnrollment(item)?.admissionNumber ?? "No adm. no."}
                      </p>
                    </td>

                    {/* CLASS */}
                    <td className="p-4 text-[#475569] whitespace-nowrap">
                      {getClassName(item)}
                    </td>

                    {/* SUBJECT */}
                    <td className="p-4 text-[#475569] whitespace-nowrap">{item.subject?.name ?? "—"}</td>

                    {/* MARKS */}
                    <td className="p-4 text-[#475569] whitespace-nowrap">
                      {item.marks?.marksObtained != null ? item.marks.marksObtained : "—"}
                    </td>

                    {/* AMOUNT */}
                    <td className="p-4 font-bold text-[#0f172a] whitespace-nowrap">
                      {item.requestedAmount != null ? `₹ ${item.requestedAmount}` : "—"}
                    </td>

                    {/* PAYMENT TOGGLE */}
                    <td className="p-4 whitespace-nowrap">
                      <button
                        onClick={() => updatePayment(item.id, !item.isPaid)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border shadow-sm ${
                          item.isPaid
                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            : "bg-[#fef2f2] text-[#e11d48] border-[#fecaca] hover:bg-[#fee2e2]"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${item.isPaid ? "bg-green-500" : "bg-[#e11d48]"}`} />
                        {item.isPaid ? "Paid" : "Pending"}
                      </button>
                    </td>

                    {/* STATUS BADGE */}
                    <td className="p-4 whitespace-nowrap">
                      <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${STATUS_STYLES[item.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {item.status?.replace(/_/g, " ")}
                      </span>
                    </td>

                    {/* UPLOAD */}
                    <td className="p-4 text-center whitespace-nowrap">
                      <label className="inline-flex items-center justify-center bg-white border border-[#e2e8f0] hover:bg-[#f8fafc] text-[#475569] px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer focus-within:ring-2 focus-within:ring-blue-500/20">
                        <svg className="w-3.5 h-3.5 mr-1.5 text-[#64748b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {item.answerSheetFileKey ? "Re-upload" : "Upload"}
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => uploadAnswerSheet(item.id, e.target.files[0])}
                          className="sr-only"
                          disabled={loading}
                        />
                      </label>
                    </td>

                    {/* VIEW SCRIPT */}
                    <td className="p-4 text-center whitespace-nowrap">
                      {item.answerSheetFileKey ? (
                        <button
                          onClick={() => openAnswerSheet(item.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-600/10 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          View Script
                        </button>
                      ) : (
                        <span className="text-xs text-[#94a3b8] font-normal italic">None Uploaded</span>
                      )}
                    </td>

                    {/* VIEW DETAILS */}
                    <td className="p-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500/30"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Details
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {selectedItem && (
        <DetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpload={uploadAnswerSheet}
          onViewScript={openAnswerSheet}
          uploading={loading}
        />
      )}
    </div>
  );
};

export default ScriptViewRequests;