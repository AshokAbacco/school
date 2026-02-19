// components/DocumentUploadSection.jsx
import { useState } from "react";
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Image as ImgIcon,
  File as FileIcon,
} from "lucide-react";
import { COLORS } from "./FormFields";

const fmtB = (b) =>
  !b
    ? ""
    : b < 1024
      ? `${b} B`
      : b < 1048576
        ? `${(b / 1024).toFixed(1)} KB`
        : `${(b / 1048576).toFixed(1)} MB`;

export default function DocumentUploadSection({
  fdocs,
  setFdocs,
  xdocs,
  setXdocs,
  frefs,
  FDOCS,
}) {
  const rmFixed = (id) => {
    setFdocs((p) => ({ ...p, [id]: null }));
    if (frefs.current[id]) frefs.current[id].value = "";
  };

  const uploadedCount = Object.values(fdocs).filter(Boolean).length;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
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

      {/* ── Required Documents ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: `1px solid ${COLORS.border}` }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            background: `${COLORS.light}22`,
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <p className="text-sm font-bold" style={{ color: COLORS.primary }}>
            Required Documents
          </p>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: COLORS.accent + "33", color: COLORS.primary }}
          >
            {uploadedCount}/{FDOCS.length}
          </span>
        </div>

        <div className="p-4 grid grid-cols-2 gap-3">
          {FDOCS.map((doc) => {
            const file = fdocs[doc.id];
            return (
              <div
                key={doc.id}
                className="rounded-xl border-2 border-dashed transition-all"
                style={{
                  borderColor: file ? "#86efac" : COLORS.border,
                  background: file ? "#f0fdf4" : "white",
                }}
              >
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  ref={(el) => (frefs.current[doc.id] = el)}
                  onChange={(e) =>
                    setFdocs((p) => ({ ...p, [doc.id]: e.target.files[0] }))
                  }
                  className="hidden"
                  id={`fd-${doc.id}`}
                />

                {file ? (
                  <div className="flex items-center gap-2 p-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: "white",
                        border: `1px solid #bbf7d0`,
                      }}
                    >
                      {file.type?.startsWith("image/") ? (
                        <ImgIcon size={14} style={{ color: COLORS.accent }} />
                      ) : (
                        <FileIcon size={14} style={{ color: "#f97316" }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-semibold truncate"
                        style={{ color: COLORS.primary }}
                      >
                        {doc.label}
                      </p>
                      <p
                        className="text-[10px] truncate"
                        style={{ color: COLORS.secondary }}
                      >
                        {file.name}
                      </p>
                      <span className="text-[10px] font-semibold flex items-center gap-1 text-green-600">
                        <CheckCircle size={9} />
                        {fmtB(file.size)}
                      </span>
                    </div>
                    <button
                      onClick={() => rmFixed(doc.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor={`fd-${doc.id}`}
                    className="flex flex-col items-center gap-1.5 p-4 cursor-pointer"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        background: "white",
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <Upload size={14} style={{ color: COLORS.secondary }} />
                    </div>
                    <p
                      className="text-xs font-semibold text-center"
                      style={{ color: COLORS.primary }}
                    >
                      {doc.label}
                      {doc.req && (
                        <span className="text-red-500 ml-0.5">*</span>
                      )}
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: COLORS.secondary }}
                    >
                      PDF, JPG, PNG, DOC
                    </p>
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Additional Documents ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: `1px solid ${COLORS.border}` }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            background: "#fffbeb50",
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <p className="text-sm font-bold" style={{ color: COLORS.primary }}>
            Additional Documents{" "}
            <span
              className="text-xs font-normal"
              style={{ color: COLORS.secondary }}
            >
              (Optional)
            </span>
          </p>
          <button
            onClick={() =>
              setXdocs((p) => [...p, { id: Date.now(), label: "", file: null }])
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ background: "#f59e0b" }}
          >
            <Plus size={11} />
            Add
          </button>
        </div>

        <div className="p-4">
          {xdocs.length === 0 ? (
            <p
              className="text-xs text-center py-4"
              style={{ color: COLORS.secondary }}
            >
              No additional documents. Click "Add" to upload.
            </p>
          ) : (
            <div className="space-y-2">
              {xdocs.map((doc, i) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 p-2.5 rounded-xl"
                  style={{
                    background: `${COLORS.bgSoft}`,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 text-white"
                    style={{ background: COLORS.secondary }}
                  >
                    {i + 1}
                  </span>
                  <input
                    value={doc.label}
                    onChange={(e) =>
                      setXdocs((p) =>
                        p.map((d) =>
                          d.id === doc.id ? { ...d, label: e.target.value } : d,
                        ),
                      )
                    }
                    placeholder="Document name"
                    className="flex-1 text-sm px-2 py-1.5 rounded-lg focus:outline-none bg-white min-w-0"
                    style={{
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.primary,
                    }}
                  />
                  <label
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all"
                    style={{
                      border: `1px solid ${doc.file ? "#86efac" : COLORS.border}`,
                      background: doc.file ? "#f0fdf4" : "white",
                      color: doc.file ? "#16a34a" : COLORS.secondary,
                    }}
                  >
                    {doc.file ? (
                      <>
                        <CheckCircle size={11} />
                        {doc.file.name.length > 12
                          ? doc.file.name.slice(0, 12) + "…"
                          : doc.file.name}
                      </>
                    ) : (
                      <>
                        <Upload size={11} />
                        Upload
                      </>
                    )}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) =>
                        setXdocs((p) =>
                          p.map((d) =>
                            d.id === doc.id
                              ? { ...d, file: e.target.files[0] }
                              : d,
                          ),
                        )
                      }
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={() =>
                      setXdocs((p) => p.filter((d) => d.id !== doc.id))
                    }
                    className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
