// client/src/components/payroll/MissingPunchNotification.jsx
// Shown on Teacher Dashboard — polls for missing OUT punch
import React, { useState, useEffect } from "react";
import { AlertCircle, X, Clock } from "lucide-react";

const API = import.meta.env.VITE_API_URL;
const token = () => { try { const a = localStorage.getItem("auth"); return a ? JSON.parse(a).token : null; } catch { return null; } };

export default function MissingPunchNotification({ teacherId }) {
  const [notification, setNotification] = useState(null);
  const [dismissed, setDismissed]       = useState(false);

  useEffect(() => {
    if (!teacherId || dismissed) return;

    const check = () => {
      fetch(`${API}/api/payroll/missing-punch-check?teacherId=${teacherId}`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.hasNotification) {
            setNotification(d.notification);
          } else {
            setNotification(null);
          }
        })
        .catch(() => {});
    };

    check();
    const interval = setInterval(check, 5 * 60 * 1000); // check every 5 minutes
    return () => clearInterval(interval);
  }, [teacherId, dismissed]);

  if (!notification || dismissed) return null;

  const fmtTime = (dt) =>
    dt ? new Date(dt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "";

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-in slide-in-from-bottom-4">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl shadow-xl p-4 flex gap-3">
        <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Clock size={18} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-amber-800 text-sm">{notification.title}</p>
          <p className="text-amber-700 text-sm mt-0.5">{notification.message}</p>
          {notification.firstPunch && (
            <p className="text-amber-600 text-xs mt-1">
              Punched IN at {fmtTime(notification.firstPunch)} · {notification.minutesSinceFirstPunch} min ago
            </p>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400 hover:text-amber-600 flex-shrink-0 transition"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}