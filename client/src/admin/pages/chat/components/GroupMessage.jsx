// src/admin/pages/chat/components/GroupMessage.jsx
import React, { useEffect, useState } from "react";
import { getToken } from "../../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

const GroupMessageModal = ({ onClose }) => {
  const [classes, setClasses] = useState([]);
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // fetch classes on mount
  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/class-sections`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setClasses(data.classSections || []);
    } catch (err) {
      console.error("fetchClasses error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const toggleClass = (id) => {
    setSelectedClassIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleAll = (e) => {
    if (e.target.checked) {
      setSelectedClassIds(classes.map((c) => c.id));
    } else {
      setSelectedClassIds([]);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      alert("Please enter a message.");
      return;
    }
    if (selectedClassIds.length === 0) {
      alert("Please select at least one class.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/chat/group-send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          classSectionIds: selectedClassIds,
          message,
          type: "STUDENT",
        }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Invalid JSON from server:", text);
        alert("Server error – invalid response.");
        return;
      }

      if (!data.success) {
        console.error(data);
        alert("Failed to send: " + (data.message || "Unknown error"));
        return;
      }

      onClose();
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setSending(false);
    }
  };

  const allSelected =
    classes.length > 0 && selectedClassIds.length === classes.length;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(56,73,89,0.45)", backdropFilter: "blur(3px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        style={{ fontFamily: "'DM Sans', sans-serif", border: "1.5px solid #BDDDFC" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ background: "#384959", borderBottom: "1px solid #BDDDFC" }}
        >
          <div>
            <h2 className="text-white font-semibold text-base leading-tight">
              Group Message
            </h2>
            <p className="text-blue-200 text-xs mt-0.5">
              Send a message to students by class
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white transition-colors text-xl leading-none"
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Class selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-700">
                Select Classes
              </label>
              {classes.length > 0 && (
                <label className="flex items-center gap-1.5 text-xs text-blue-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="accent-blue-600"
                  />
                  Select All
                </label>
              )}
            </div>

            <div
              className="border rounded-xl overflow-y-auto"
              style={{
                maxHeight: 200,
                borderColor: "#BDDDFC",
                background: "#f8fbff",
              }}
            >
              {loading ? (
                <p className="text-center text-sm text-blue-400 py-6">
                  Loading classes…
                </p>
              ) : classes.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">
                  No classes found
                </p>
              ) : (
                classes.map((c) => {
                  const count = c._count?.studentEnrollments || 0;
                  const checked = selectedClassIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-blue-50 transition-colors border-b last:border-b-0"
                      style={{ borderColor: "#e8f1fb" }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleClass(c.id)}
                        className="accent-blue-600 w-4 h-4"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-slate-700 block truncate">
                          {c.name}
                        </span>
                      </div>
                      <span
                        className="text-xs font-semibold rounded-full px-2 py-0.5"
                        style={{ background: "#BDDDFC", color: "#384959" }}
                      >
                        {count} students
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            {selectedClassIds.length > 0 && (
              <p className="text-xs text-blue-600 mt-1.5">
                {selectedClassIds.length} class
                {selectedClassIds.length !== 1 ? "es" : ""} selected
              </p>
            )}
          </div>

          {/* Message textarea */}
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">
              Message
            </label>
            <textarea
              className="w-full border rounded-xl px-3.5 py-2.5 text-sm text-slate-700 resize-none outline-none transition-all"
              style={{
                borderColor: "#BDDDFC",
                background: "#f8fbff",
                minHeight: 96,
                fontFamily: "'DM Sans', sans-serif",
              }}
              placeholder="Type your message to students…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "#88BDF2")}
              onBlur={(e) => (e.target.style.borderColor = "#BDDDFC")}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{
                border: "1.5px solid #BDDDFC",
                background: "#f8fbff",
                color: "#384959",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="px-5 py-2 rounded-xl text-sm font-semibold transition-opacity"
              style={{
                background: sending ? "#6A89A7" : "#384959",
                color: "#BDDDFC",
                border: "none",
                cursor: sending ? "not-allowed" : "pointer",
              }}
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupMessageModal;