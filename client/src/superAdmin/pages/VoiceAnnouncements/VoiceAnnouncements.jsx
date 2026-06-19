// client/src/superAdmin/pages/VoiceAnnouncements/VoiceAnnouncements.jsx
import React, { useEffect, useState, useCallback } from "react";
import { Mic, ListMusic, CheckCircle2, AlertCircle, X } from "lucide-react";
import AnnouncementForm from "./AnnouncementForm";
import AnnouncementList from "./AnnouncementList";
import { fetchSchools } from "./voiceApi";
import { colors, fontFamily } from "./theme";

// ── Minimal self-contained toast stack (no external dependency assumed) ─────
function useToasts() {
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return { toasts, notify, dismiss };
}

function ToastStack({ toasts, dismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2" style={{ fontFamily }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm shadow-lg min-w-[260px]"
          style={{
            background: t.type === "error" ? "#fff" : colors.navy,
            color: t.type === "error" ? colors.danger : "#fff",
            border: t.type === "error" ? `1px solid ${colors.danger}` : "none",
          }}
        >
          {t.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex" }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

const TABS = [
  { key: "create", label: "New announcement", icon: Mic },
  { key: "sent", label: "Sent announcements", icon: ListMusic },
];

export default function VoiceAnnouncements() {
  const { toasts, notify, dismiss } = useToasts();
  const [activeTab, setActiveTab] = useState("create");
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState("");
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchSchools()
      .then((list) => {
        setSchools(list);
        if (list.length === 1) setSchoolId(list[0].id);
      })
      .catch(() => notify("error", "Couldn't load schools"))
      .finally(() => setSchoolsLoading(false));
  }, [notify]);

  const handleCreated = () => {
    setRefreshKey((k) => k + 1);
    setActiveTab("sent");
  };

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto" style={{ fontFamily }}>
      <header className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: colors.navyDark }}>
          Voice announcements
        </h1>
        <p className="text-sm mt-1" style={{ color: colors.slate }}>
          Record a voice message and send it to parents — for a whole school, specific classes, or individual students.
        </p>
      </header>

      <div
        className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
        style={{ background: "rgba(106,137,167,0.1)" }}
      >
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
              style={{
                background: active ? "#fff" : "transparent",
                color: active ? colors.navy : colors.slate,
                border: "none",
                cursor: "pointer",
                boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </div>

      {schoolsLoading ? (
        <p className="text-sm" style={{ color: colors.slate }}>Loading schools…</p>
      ) : activeTab === "create" ? (
        <AnnouncementForm
          schools={schools}
          schoolId={schoolId}
          onSchoolChange={setSchoolId}
          onCreated={handleCreated}
          notify={notify}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <select
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            className="rounded-xl text-sm px-3 py-2 w-full sm:w-72"
            style={{ border: "1px solid rgba(106,137,167,0.3)", color: colors.navyDark, fontFamily }}
          >
            <option value="">Select a school…</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <AnnouncementList schoolId={schoolId} refreshKey={refreshKey} notify={notify} />
        </div>
      )}

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
}