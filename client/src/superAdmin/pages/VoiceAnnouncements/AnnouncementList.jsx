// client/src/superAdmin/pages/VoiceAnnouncements/AnnouncementList.jsx
import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Volume2, Users, Headphones, RefreshCw, Inbox } from "lucide-react";
import { fetchAnnouncements } from "./voiceApi";
import { colors, fontFamily } from "./theme";

const TARGET_LABEL = { SCHOOL: "Entire school", CLASS: "Specific classes", STUDENT: "Specific students" };

const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const statusOf = (announcement) => {
  const now = new Date();
  const publish = new Date(announcement.publishAt);
  const expire = new Date(announcement.expireAt);
  if (now < publish) return { label: "Scheduled", bg: "rgba(106,137,167,0.12)", color: colors.slate };
  if (now > expire) return { label: "Expired", bg: "rgba(217,83,79,0.1)", color: colors.danger };
  return { label: "Live", bg: colors.successTint, color: colors.success };
};

const StatPill = ({ icon: Icon, value, label }) => (
  <span className="flex items-center gap-1 text-xs" style={{ color: colors.slate }} title={label}>
    <Icon size={13} />
    {value}
  </span>
);

export default function AnnouncementList({ schoolId, refreshKey, notify }) {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [schoolId, refreshKey]);

  useEffect(() => {
    if (!schoolId) {
      setData([]);
      return;
    }
    setLoading(true);
    fetchAnnouncements(schoolId, page, 10)
      .then((res) => {
        setData(res.data);
        setMeta(res.meta || { page: 1, totalPages: 1, total: res.data.length });
      })
      .catch(() => notify("error", "Couldn't load announcements"))
      .finally(() => setLoading(false));
  }, [schoolId, page, refreshKey, notify]);

  if (!schoolId) {
    return (
      <div
        className="rounded-2xl border p-10 flex flex-col items-center text-center gap-2"
        style={{ borderColor: "rgba(106,137,167,0.18)", background: "#fff", fontFamily }}
      >
        <Inbox size={28} color={colors.slate} />
        <p className="text-sm" style={{ color: colors.slate }}>Select a school to view its announcements.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" style={{ fontFamily }}>
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ borderColor: "rgba(106,137,167,0.18)", background: "#fff" }}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm" style={{ color: colors.slate }}>
            <RefreshCw size={15} className="animate-spin" /> Loading announcements…
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-2 py-12">
            <Inbox size={28} color={colors.slate} />
            <p className="text-sm" style={{ color: colors.slate }}>No announcements sent for this school yet.</p>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: "rgba(106,137,167,0.1)" }}>
            {data.map((a) => {
              const status = statusOf(a);
              return (
                <li key={a.id} className="p-4 sm:p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold truncate" style={{ color: colors.navyDark }}>
                          {a.title || "Untitled announcement"}
                        </h4>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
                          style={{ background: status.bg, color: status.color }}
                        >
                          {status.label}
                        </span>
                      </div>
                      {a.description && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: colors.slate }}>
                          {a.description}
                        </p>
                      )}
                    </div>
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{ background: colors.skyTint, color: colors.navy }}
                    >
                      {TARGET_LABEL[a.targetType] || a.targetType}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center rounded-full flex-shrink-0"
                      style={{ width: 30, height: 30, background: colors.skyTint }}
                    >
                      <Volume2 size={14} color={colors.navy} />
                    </div>
                    <audio controls src={a.audioUrl} className="flex-1 h-8" style={{ maxWidth: 360 }} />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs" style={{ color: colors.slate }}>
                    <span>Publish: {fmtDateTime(a.publishAt)}</span>
                    <span>Expires: {fmtDateTime(a.expireAt)}</span>
                    <StatPill icon={Users} value={a.totalRecipients ?? 0} label="Total recipients" />
                    <StatPill icon={Headphones} value={a.uniqueListeners ?? 0} label="Unique listeners" />
                    <StatPill icon={Volume2} value={a.totalListens ?? 0} label="Total listens" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm" style={{ color: colors.slate }}>
          <span>
            Page {meta.page} of {meta.totalPages} · {meta.total} total
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 disabled:opacity-40"
              style={{ border: "1px solid rgba(106,137,167,0.25)", background: "#fff", cursor: "pointer" }}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              type="button"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 disabled:opacity-40"
              style={{ border: "1px solid rgba(106,137,167,0.25)", background: "#fff", cursor: "pointer" }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}