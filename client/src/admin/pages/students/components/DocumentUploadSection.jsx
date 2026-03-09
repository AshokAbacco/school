// components/DocumentUploadSection.jsx
import { useState } from "react";
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Image as ImgIcon,
  File as FileIcon,
} from "lucide-react";
import { COLORS } from "./FormFields";

// ── All document types from DocumentType enum ─────────────────────────────────
export const DOC_TYPE_OPTIONS = [
  { value: "AADHAR_CARD", label: "Aadhaar Card" },
  { value: "BIRTH_CERTIFICATE", label: "Birth Certificate" },
  { value: "PASSBOOK", label: "Bank Passbook" },
  { value: "TRANSFER_CERTIFICATE", label: "Transfer Certificate" },
  { value: "MARKSHEET", label: "Previous Marksheet" },
  { value: "MIGRATION_CERTIFICATE", label: "Migration Certificate" },
  { value: "CHARACTER_CERTIFICATE", label: "Character Certificate" },
  { value: "MEDICAL_CERTIFICATE", label: "Medical Certificate" },
  { value: "PASSPORT", label: "Passport" },
  { value: "CASTE_CERTIFICATE", label: "Caste Certificate" },
  { value: "INCOME_CERTIFICATE", label: "Income Certificate" },
  { value: "PHOTO", label: "Passport Size Photo" },
  { value: "CUSTOM", label: "Other (Custom)" },
];

const fmtB = (b) =>
  !b
    ? ""
    : b < 1024
      ? `${b} B`
      : b < 1048576
        ? `${(b / 1024).toFixed(1)} KB`
        : `${(b / 1048576).toFixed(1)} MB`;

// ── Single document row ───────────────────────────────────────────────────────
function DocRow({ doc, index, onChange, onRemove }) {
  const isCustom = doc.documentName === "CUSTOM";

  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{
        border: `1px solid ${doc.file ? "#86efac" : COLORS.border}`,
        background: doc.file ? "#f0fdf4" : "white",
      }}
    >
      {/* Row top: number + type dropdown + remove */}
      <div className="flex items-center gap-2">
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 text-white"
          style={{ background: COLORS.secondary }}
        >
          {index + 1}
        </span>

        {/* Document type dropdown */}
        <select
          value={doc.documentName}
          onChange={(e) => onChange(doc.id, "documentName", e.target.value)}
          className="flex-1 text-sm border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 transition-all"
          style={{ borderColor: COLORS.border, color: COLORS.primary }}
        >
          <option value="">— Select document type —</option>
          {DOC_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Remove button */}
        <button
          onClick={() => onRemove(doc.id)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Custom label — only shown when type = CUSTOM */}
      {isCustom && (
        <input
          value={doc.customLabel || ""}
          onChange={(e) => onChange(doc.id, "customLabel", e.target.value)}
          placeholder="Enter document name (required)"
          className="w-full text-sm border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 transition-all"
          style={{ borderColor: COLORS.border, color: COLORS.primary }}
        />
      )}

      {/* File upload row */}
      <div className="flex items-center gap-2">
        <label
          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all"
          style={{
            border: `1px dashed ${doc.file ? "#86efac" : COLORS.border}`,
            background: doc.file ? "#f0fdf4" : `${COLORS.bgSoft}`,
          }}
        >
          {doc.file ? (
            <>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "white", border: "1px solid #bbf7d0" }}
              >
                {doc.file.type?.startsWith("image/") ? (
                  <ImgIcon size={13} style={{ color: COLORS.accent }} />
                ) : (
                  <FileIcon size={13} style={{ color: "#f97316" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-green-700">
                  {doc.file.name}
                </p>
                <span className="text-[10px] text-green-600 flex items-center gap-1 font-semibold">
                  <CheckCircle size={9} /> {fmtB(doc.file.size)}
                </span>
              </div>
            </>
          ) : (
            <>
              <Upload size={13} style={{ color: COLORS.secondary }} />
              <span className="text-xs" style={{ color: COLORS.secondary }}>
                Click to upload file
              </span>
              <span
                className="text-[10px] ml-auto"
                style={{ color: COLORS.secondary }}
              >
                PDF, JPG, PNG, DOC
              </span>
            </>
          )}
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={(e) => onChange(doc.id, "file", e.target.files[0])}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DocumentUploadSection({ docs, setDocs }) {
  const addDoc = () => {
    setDocs((prev) => [
      ...prev,
      { id: Date.now(), documentName: "", customLabel: "", file: null },
    ]);
  };

  const updateDoc = (id, field, value) => {
    setDocs((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              [field]: value,
              // Reset customLabel when switching away from CUSTOM
              ...(field === "documentName" && value !== "CUSTOM"
                ? { customLabel: "" }
                : {}),
            }
          : d,
      ),
    );
  };

  const removeDoc = (id) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const uploadedCount = docs.filter((d) => d.file).length;
  const totalCount = docs.length;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Notice banner */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs"
        style={{
          background: "#fffbeb",
          border: "1px solid #fde68a",
          color: "#92400e",
        }}
      >
        <AlertCircle
          size={14}
          className="shrink-0"
          style={{ color: "#f59e0b" }}
        />
        Document upload is <strong className="mx-1">optional</strong>. You can
        save without uploading any files.
      </div>

      {/* Header row */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: `1px solid ${COLORS.border}` }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            background: `${COLORS.light}22`,
            borderBottom:
              totalCount > 0 ? `1px solid ${COLORS.border}` : "none",
          }}
        >
          <div className="flex items-center gap-2">
            <FileText size={15} style={{ color: COLORS.primary }} />
            <p className="text-sm font-bold" style={{ color: COLORS.primary }}>
              Documents
            </p>
            {totalCount > 0 && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: COLORS.accent + "33",
                  color: COLORS.primary,
                }}
              >
                {uploadedCount}/{totalCount} uploaded
              </span>
            )}
          </div>
          <button
            onClick={addDoc}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: COLORS.primary }}
          >
            <Plus size={12} />
            Add Document
          </button>
        </div>

        {/* Document rows */}
        {totalCount === 0 ? (
          <div className="px-4 py-8 flex flex-col items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: `${COLORS.light}33` }}
            >
              <FileText size={22} style={{ color: COLORS.secondary }} />
            </div>
            <p
              className="text-sm text-center"
              style={{ color: COLORS.secondary }}
            >
              No documents added yet.
              <br />
              Click <strong>Add Document</strong> to upload student documents.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {docs.map((doc, i) => (
              <DocRow
                key={doc.id}
                doc={doc}
                index={i}
                onChange={updateDoc}
                onRemove={removeDoc}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick-add chips for common documents */}
      {totalCount === 0 && (
        <div className="space-y-2">
          <p
            className="text-xs font-bold ml-1"
            style={{ color: COLORS.secondary }}
          >
            Quick add common documents:
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "AADHAR_CARD",
              "BIRTH_CERTIFICATE",
              "MARKSHEET",
              "TRANSFER_CERTIFICATE",
              "CASTE_CERTIFICATE",
              "INCOME_CERTIFICATE",
            ].map((type) => {
              const opt = DOC_TYPE_OPTIONS.find((o) => o.value === type);
              return (
                <button
                  key={type}
                  onClick={() =>
                    setDocs((prev) => [
                      ...prev,
                      {
                        id: Date.now() + Math.random(),
                        documentName: type,
                        customLabel: "",
                        file: null,
                      },
                    ])
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-white"
                  style={{
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.secondary,
                    background: COLORS.bgSoft,
                  }}
                >
                  <Plus size={10} />
                  {opt?.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
