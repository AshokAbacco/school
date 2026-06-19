// client/src/superAdmin/pages/VoiceAnnouncements/AnnouncementForm.jsx
import React, { useEffect, useState, useCallback } from "react";
import { School, Users, UserCheck, Search, X, Loader2, Send } from "lucide-react";
import VoiceRecorder from "./VoiceRecorder";
import { fetchClassSections, searchStudents, uploadVoiceAudio, createVoiceAnnouncement } from "./voiceApi";
import { colors, fontFamily } from "./theme";

const AUDIENCE_OPTIONS = [
  { value: "SCHOOL", label: "Entire school", icon: School },
  { value: "CLASS", label: "Specific classes", icon: Users },
  { value: "STUDENT", label: "Specific students", icon: UserCheck },
];

const inputStyle = {
  fontFamily,
  border: "1px solid rgba(106,137,167,0.3)",
  borderRadius: "10px",
  padding: "9px 12px",
  fontSize: "14px",
  width: "100%",
  outline: "none",
  color: colors.navyDark,
  background: "#fff",
};

const labelStyle = {
  fontFamily,
  fontSize: "12px",
  fontWeight: 600,
  color: colors.slate,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: "6px",
  display: "block",
};

export default function AnnouncementForm({ schools, schoolId, onSchoolChange, onCreated, notify }) {
  const [targetType, setTargetType] = useState("SCHOOL");

  const [classSections, setClassSections] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState([]);

  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const [expireAt, setExpireAt] = useState("");

  const [audioBlob, setAudioBlob] = useState(null);
  const [audioDurationSec, setAudioDurationSec] = useState(0);
  const [uploadedAudio, setUploadedAudio] = useState(null); // { audioUrl, audioKey }
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // ── Reset audience-specific selections when school or target type changes ──
  useEffect(() => {
    setSelectedClassIds([]);
    setSelectedStudents([]);
    setStudentQuery("");
    setStudentResults([]);
  }, [schoolId, targetType]);

  // ── Load class sections when needed ──────────────────────────────────────
  useEffect(() => {
    if (targetType !== "CLASS" || !schoolId) return;
    setClassesLoading(true);
    fetchClassSections(schoolId)
      .then(setClassSections)
      .catch(() => notify("error", "Couldn't load class sections for this school"))
      .finally(() => setClassesLoading(false));
  }, [targetType, schoolId, notify]);

  // ── Debounced student search ─────────────────────────────────────────────
  useEffect(() => {
    if (targetType !== "STUDENT" || !schoolId) return;
    const handle = setTimeout(() => {
      setStudentSearchLoading(true);
      searchStudents(schoolId, studentQuery)
        .then(setStudentResults)
        .catch(() => notify("error", "Student search failed"))
        .finally(() => setStudentSearchLoading(false));
    }, 350);
    return () => clearTimeout(handle);
  }, [targetType, schoolId, studentQuery, notify]);

  const toggleClass = (id) => {
    setSelectedClassIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const toggleStudent = (student) => {
    setSelectedStudents((prev) =>
      prev.some((s) => s.id === student.id) ? prev.filter((s) => s.id !== student.id) : [...prev, student]
    );
  };

  const runUpload = useCallback(
    (blob) => {
      if (!schoolId) return;
      setUploadStatus("uploading");
      setUploadProgress(0);
      uploadVoiceAudio(blob, schoolId, setUploadProgress)
        .then((result) => {
          setUploadedAudio(result);
          setUploadStatus("success");
        })
        .catch(() => {
          setUploadStatus("error");
          notify("error", "Audio upload failed. You can retry without re-recording.");
        });
    },
    [schoolId, notify]
  );

  const handleRecordingComplete = (blob, durationSec) => {
    setAudioBlob(blob);
    setAudioDurationSec(durationSec);
    setUploadedAudio(null);
    runUpload(blob);
  };

  const handleClearRecording = () => {
    setAudioBlob(null);
    setAudioDurationSec(0);
    setUploadedAudio(null);
    setUploadStatus("idle");
  };

  const validate = () => {
    if (!schoolId) return "Select a school first.";
    if (targetType === "CLASS" && selectedClassIds.length === 0) return "Select at least one class.";
    if (targetType === "STUDENT" && selectedStudents.length === 0) return "Select at least one student.";
    if (!title.trim()) return "Title is required.";
    if (!uploadedAudio) return "Record and upload a voice message before sending.";
    if (!publishAt) return "Set a publish date & time.";
    if (!expireAt) return "Set an expiry date & time.";
    if (new Date(expireAt) <= new Date(publishAt)) return "Expiry must be after the publish time.";
    return null;
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPublishAt("");
    setExpireAt("");
    setTargetType("SCHOOL");
    setSelectedClassIds([]);
    setSelectedStudents([]);
    setStudentQuery("");
    handleClearRecording();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await createVoiceAnnouncement({
        schoolId,
        title: title.trim(),
        description: description.trim() || null,
        audioUrl: uploadedAudio.audioUrl,
        audioKey: uploadedAudio.audioKey,
        durationSec: audioDurationSec,
        publishAt: new Date(publishAt).toISOString(),
        expireAt: new Date(expireAt).toISOString(),
        targetType,
        classSectionIds: targetType === "CLASS" ? selectedClassIds : undefined,
        studentIds: targetType === "STUDENT" ? selectedStudents.map((s) => s.id) : undefined,
      });
      notify("success", "Announcement scheduled");
      resetForm();
      onCreated?.();
    } catch (err) {
      notify("error", err?.response?.data?.message || "Couldn't create the announcement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" style={{ fontFamily }}>
      {/* ── Step 1: School ── */}
      <section className="rounded-2xl border p-5" style={{ borderColor: "rgba(106,137,167,0.18)", background: "#fff" }}>
        <label style={labelStyle}>1 · School</label>
        <select
          value={schoolId}
          onChange={(e) => onSchoolChange(e.target.value)}
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          <option value="">Select a school…</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </section>

      {/* ── Step 2: Audience ── */}
      <section className="rounded-2xl border p-5" style={{ borderColor: "rgba(106,137,167,0.18)", background: "#fff" }}>
        <label style={labelStyle}>2 · Audience</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
          {AUDIENCE_OPTIONS.map(({ value, label, icon: Icon }) => {
            const active = targetType === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTargetType(value)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
                style={{
                  border: `1.5px solid ${active ? colors.sky : "rgba(106,137,167,0.25)"}`,
                  background: active ? colors.skyTint : "transparent",
                  color: active ? colors.navy : colors.slate,
                  cursor: "pointer",
                }}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </div>

        {targetType === "CLASS" && (
          <div>
            {classesLoading ? (
              <div className="flex items-center gap-2 text-sm py-4" style={{ color: colors.slate }}>
                <Loader2 size={15} className="animate-spin" /> Loading classes…
              </div>
            ) : classSections.length === 0 ? (
              <p className="text-sm py-2" style={{ color: colors.slate }}>
                {schoolId ? "No class sections found for this school." : "Select a school to see its classes."}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                {classSections.map((c) => {
                  const checked = selectedClassIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm cursor-pointer"
                      style={{
                        border: `1px solid ${checked ? colors.sky : "rgba(106,137,167,0.2)"}`,
                        background: checked ? colors.skyTint : "transparent",
                        color: colors.navyDark,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleClass(c.id)}
                        className="accent-[#88BDF2]"
                      />
                      <span className="truncate">{c.name}</span>
                      <span className="ml-auto text-xs" style={{ color: colors.slate }}>
                        {c.studentCount}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {targetType === "STUDENT" && (
          <div>
            {selectedStudents.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {selectedStudents.map((s) => (
                  <span
                    key={s.id}
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
                    style={{ background: colors.skyTint, color: colors.navy }}
                  >
                    {s.name}
                    <button
                      type="button"
                      onClick={() => toggleStudent(s)}
                      style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative mb-2">
              <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: colors.slate }} />
              <input
                type="text"
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                placeholder={schoolId ? "Search students by name or code…" : "Select a school first"}
                disabled={!schoolId}
                style={{ ...inputStyle, paddingLeft: "32px" }}
              />
            </div>

            <div className="max-h-44 overflow-y-auto rounded-lg" style={{ border: "1px solid rgba(106,137,167,0.15)" }}>
              {studentSearchLoading ? (
                <div className="flex items-center gap-2 text-sm p-3" style={{ color: colors.slate }}>
                  <Loader2 size={14} className="animate-spin" /> Searching…
                </div>
              ) : studentResults.length === 0 ? (
                <p className="text-sm p-3" style={{ color: colors.slate }}>
                  {schoolId ? "No students found." : "—"}
                </p>
              ) : (
                studentResults.map((s) => {
                  const checked = selectedStudents.some((sel) => sel.id === s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-b last:border-b-0"
                      style={{ borderColor: "rgba(106,137,167,0.1)", background: checked ? colors.skyTint : "transparent" }}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleStudent(s)} className="accent-[#88BDF2]" />
                      <span style={{ color: colors.navyDark }}>{s.name}</span>
                      <span className="ml-auto text-xs" style={{ color: colors.slate }}>
                        {s.code} · {s.extra}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Step 3: Voice ── */}
      <VoiceRecorder
        disabled={!schoolId}
        onRecordingComplete={handleRecordingComplete}
        onClear={handleClearRecording}
        uploadStatus={uploadStatus}
        uploadProgress={uploadProgress}
        onRetryUpload={() => audioBlob && runUpload(audioBlob)}
      />

      {/* ── Step 4: Details & schedule ── */}
      <section className="rounded-2xl border p-5" style={{ borderColor: "rgba(106,137,167,0.18)", background: "#fff" }}>
        <label style={labelStyle}>4 · Details &amp; schedule</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label style={{ ...labelStyle, marginBottom: "4px" }}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Parent-teacher meeting reminder"
              style={inputStyle}
            />
          </div>
          <div className="sm:col-span-2">
            <label style={{ ...labelStyle, marginBottom: "4px" }}>Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Short context shown above the audio player"
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
          <div>
            <label style={{ ...labelStyle, marginBottom: "4px" }}>Publish at</label>
            <input
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ ...labelStyle, marginBottom: "4px" }}>Expires at</label>
            <input
              type="datetime-local"
              value={expireAt}
              onChange={(e) => setExpireAt(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      </section>

      {formError && (
        <div className="rounded-xl px-4 py-2.5 text-sm" style={{ background: colors.dangerTint, color: colors.danger }}>
          {formError}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-opacity"
        style={{
          background: colors.navy,
          color: "#fff",
          border: "none",
          cursor: submitting ? "not-allowed" : "pointer",
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        {submitting ? "Sending…" : "Schedule announcement"}
      </button>
    </form>
  );
}