// admin/pages/classes/components/CreateAcademicYearModal.jsx

import { useState } from "react";
import {
  X,
  Loader2,
  CalendarDays,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { createAcademicYear } from "../api/classesApi"; // Importing from your api file

// ── Validation ────────────────────────────────────────────────────────────────
const YEAR_REGEX = /^\d{2,4}[-–]\d{2,4}$/;

function validateName(name) {
  if (!name.trim()) return "Academic year name is required";
  if (!YEAR_REGEX.test(name.trim()))
    return 'Use format like "2025-26" or "2025-2026"';
  return "";
}

export default function CreateAcademicYearModal({ open, onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(""); // New State
  const [endDate, setEndDate] = useState(""); // New State
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) return null;

  const reset = () => {
    setName("");
    setStartDate("");
    setEndDate("");
    setError("");
    setBusy(false);
    setDone(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const nameError = validateName(name);
    if (nameError) return setError(nameError);
    if (!startDate || !endDate)
      return setError("Start and End dates are required");

    // Basic date validation
    if (new Date(startDate) >= new Date(endDate)) {
      return setError("End date must be after the start date");
    }

    setBusy(true);
    setError("");

    try {
      // Calling your api function with the new fields
      const data = await createAcademicYear({
        name: name.trim(),
        startDate,
        endDate,
      });

      setDone(true);
      if (onSuccess) onSuccess(data.academicYear);

      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !busy) handleSubmit();
    if (e.key === "Escape") handleClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden"
        style={{
          maxWidth: "440px",
          border: "1px solid rgba(136,189,242,0.30)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            background: "rgba(189,221,252,0.08)",
            borderBottom: "1px solid rgba(136,189,242,0.20)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(136,189,242,0.18)" }}
            >
              <CalendarDays size={17} style={{ color: "#384959" }} />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: "#384959" }}>
                Create Academic Year
              </p>
              <p className="text-xs" style={{ color: "#6A89A7" }}>
                e.g. 2025-26
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-gray-100"
            style={{ color: "#6A89A7" }}
          >
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.12)" }}
              >
                <CheckCircle size={28} style={{ color: "#16a34a" }} />
              </div>
              <p className="font-bold text-sm" style={{ color: "#384959" }}>
                Academic Year Created!
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[11px] font-medium">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* Year name input */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-bold ml-0.5"
                  style={{ color: "#6A89A7" }}
                >
                  Year Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError("");
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. 2025-26"
                  className="w-full text-sm rounded-xl px-4 py-2.5 border outline-none transition-all"
                  style={{
                    borderColor: "rgba(136,189,242,0.35)",
                    color: "#384959",
                  }}
                />
              </div>

              {/* Date pickers row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    className="text-xs font-bold ml-0.5"
                    style={{ color: "#6A89A7" }}
                  >
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (error) setError("");
                    }}
                    className="w-full text-sm rounded-xl px-3 py-2 border outline-none transition-all"
                    style={{
                      borderColor: "rgba(136,189,242,0.35)",
                      color: "#384959",
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    className="text-xs font-bold ml-0.5"
                    style={{ color: "#6A89A7" }}
                  >
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (error) setError("");
                    }}
                    className="w-full text-sm rounded-xl px-3 py-2 border outline-none transition-all"
                    style={{
                      borderColor: "rgba(136,189,242,0.35)",
                      color: "#384959",
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div
            className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50/50 border-t"
            style={{ borderColor: "rgba(136,189,242,0.18)" }}
          >
            <button
              onClick={handleClose}
              disabled={busy}
              className="px-4 py-2 rounded-xl text-sm font-semibold border bg-white"
              style={{
                borderColor: "rgba(136,189,242,0.35)",
                color: "#6A89A7",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={busy || !name.trim() || !startDate || !endDate}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition-all disabled:opacity-50"
              style={{ background: "#384959" }}
            >
              {busy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CalendarDays size={14} />
              )}
              {busy ? "Creating…" : "Create Year"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
