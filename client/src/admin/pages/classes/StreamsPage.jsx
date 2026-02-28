// client/src/admin/pages/classes/StreamsPage.jsx
// PUC admins — manage Science/Commerce/Arts streams + their combinations (PCMB, PCMC etc.)
import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Check,
  Waves,
  ChevronDown,
  ChevronRight,
  GitBranch,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/PageLayout";
import {
  fetchStreams,
  createStream,
  updateStream,
  deleteStream,
  createCombination,
  updateCombination,
  deleteCombination,
} from "./api/classesApi";

const C = {
  bg: "#F4F8FC",
  card: "#FFFFFF",
  primary: "#384959",
  mid: "#6A89A7",
  light: "#88BDF2",
  pale: "rgba(189,221,252,0.25)",
  border: "rgba(136,189,242,0.25)",
};
const IS = {
  padding: "8px 11px",
  border: `1.5px solid rgba(136,189,242,0.4)`,
  borderRadius: 10,
  fontSize: 13,
  color: "#384959",
  fontFamily: "Inter, sans-serif",
  outline: "none",
  width: "100%",
  background: "#fff",
  boxSizing: "border-box",
};
const STREAM_COLORS = {
  Science: { bg: "rgba(59,130,246,0.1)", color: "#1d4ed8" },
  Commerce: { bg: "rgba(245,158,11,0.1)", color: "#92400e" },
  Arts: { bg: "rgba(168,85,247,0.1)", color: "#6d28d9" },
  default: { bg: "rgba(107,114,128,0.1)", color: "#374151" },
};

function Toast({ type, msg, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className="fixed bottom-6 right-6 flex items-center gap-2 rounded-xl shadow-lg text-sm font-medium z-50"
      style={{
        padding: "12px 18px",
        background: type === "success" ? "#f0fdf4" : "#fef2f2",
        border: `1.5px solid ${type === "success" ? "#bbf7d0" : "#fecaca"}`,
        color: type === "success" ? "#15803d" : "#dc2626",
      }}
    >
      {type === "success" ? (
        <CheckCircle2 size={15} />
      ) : (
        <AlertCircle size={15} />
      )}{" "}
      {msg}
    </div>
  );
}

// ── Combination row (inline edit) — NO code field ─────────────────────────────
function CombinationRow({
  combination,
  streamId,
  onDelete,
  onUpdate,
  setToast,
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(combination.name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const handleUpdate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await updateCombination(streamId, combination.id, {
        name: name.trim(),
      });
      onUpdate(res.combination);
      setEditing(false);
      setToast({ type: "success", msg: "Group updated" });
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: "rgba(136,189,242,0.1)" }}
      >
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name"
          style={{ ...IS, flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleUpdate();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <button
          onClick={handleUpdate}
          disabled={saving}
          style={{
            border: "none",
            background: "#384959",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
            color: "#fff",
            display: "flex",
          }}
        >
          {saving ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Check size={12} />
          )}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setName(combination.name);
          }}
          style={{
            border: "none",
            background: C.pale,
            borderRadius: 8,
            padding: "6px 8px",
            cursor: "pointer",
            display: "flex",
          }}
        >
          <X size={12} style={{ color: C.mid }} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between px-3 py-2 rounded-lg"
      style={{ background: "rgba(136,189,242,0.06)" }}
    >
      <div className="flex items-center gap-2">
        <GitBranch size={12} style={{ color: C.mid }} />
        <span className="text-sm font-medium" style={{ color: C.primary }}>
          {combination.name}
        </span>
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => setEditing(true)}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: "3px 5px",
            borderRadius: 6,
          }}
        >
          <Pencil size={11} style={{ color: C.mid }} />
        </button>
        <button
          onClick={() => onDelete(combination.id)}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: "3px 5px",
            borderRadius: 6,
          }}
        >
          <Trash2 size={11} style={{ color: "#ef4444" }} />
        </button>
      </div>
    </div>
  );
}

// ── Inline add-combo row — extracted OUT of StreamCard to avoid remount ────────
function AddComboRow({ streamId, onAdded, setToast }) {
  const [active, setActive] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (active && inputRef.current) inputRef.current.focus();
  }, [active]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await createCombination(streamId, { name: name.trim() });
      onAdded(res.combination);
      setName("");
      setToast({ type: "success", msg: "Group added" });
      // keep input open and focused for rapid entry
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        style={{
          border: "none",
          background: C.pale,
          borderRadius: 7,
          padding: "4px 10px",
          fontSize: 11,
          fontWeight: 600,
          color: C.primary,
          cursor: "pointer",
          fontFamily: "Inter, sans-serif",
        }}
      >
        + Add Group
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 pt-1">
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Group name (e.g. PCMB, CEBA, HEP)"
        style={{ ...IS, flex: 1 }}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
          if (e.key === "Escape") {
            setActive(false);
            setName("");
          }
        }}
      />
      <button
        onClick={handleAdd}
        disabled={saving}
        style={{
          border: "none",
          background: C.primary,
          borderRadius: 8,
          padding: "8px 12px",
          cursor: "pointer",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {saving ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Check size={13} />
        )}
      </button>
      <button
        onClick={() => {
          setActive(false);
          setName("");
        }}
        style={{
          border: "none",
          background: C.pale,
          borderRadius: 8,
          padding: "8px 9px",
          cursor: "pointer",
          display: "flex",
          flexShrink: 0,
        }}
      >
        <X size={13} style={{ color: C.mid }} />
      </button>
    </div>
  );
}

// ── Stream card ───────────────────────────────────────────────────────────────
function StreamCard({ stream, onDelete, onUpdate, setToast }) {
  const colors = STREAM_COLORS[stream.name] || STREAM_COLORS.default;
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: stream.name,
    code: stream.code || "",
    hasCombinations: stream.hasCombinations ?? false,
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [combinations, setCombinations] = useState(stream.combinations || []);

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) return;
    setSavingEdit(true);
    try {
      const res = await updateStream(stream.id, editForm);
      onUpdate(res.stream);
      setEditing(false);
      setToast({ type: "success", msg: "Stream updated" });
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteCombo = async (combinationId) => {
    if (!window.confirm("Delete this group?")) return;
    try {
      await deleteCombination(stream.id, combinationId);
      setCombinations((prev) => prev.filter((c) => c.id !== combinationId));
      setToast({ type: "success", msg: "Group deleted" });
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${C.border}`, background: C.card }}
    >
      <div className="px-5 py-4">
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.mid,
                    display: "block",
                    marginBottom: 3,
                  }}
                >
                  Stream Name
                </label>
                <input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, name: e.target.value }))
                  }
                  style={IS}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.mid,
                    display: "block",
                    marginBottom: 3,
                  }}
                >
                  Code (optional)
                </label>
                <input
                  value={editForm.code}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, code: e.target.value }))
                  }
                  placeholder="e.g. SCI"
                  style={IS}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.mid,
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Has groups / combinations?
              </label>
              <div className="flex gap-2">
                {[
                  { val: true, label: "Yes — has groups" },
                  { val: false, label: "No groups" },
                ].map(({ val, label }) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() =>
                      setEditForm((p) => ({ ...p, hasCombinations: val }))
                    }
                    style={{
                      padding: "5px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: `1.5px solid ${editForm.hasCombinations === val ? C.primary : "rgba(136,189,242,0.4)"}`,
                      background:
                        editForm.hasCombinations === val
                          ? C.primary
                          : "transparent",
                      color: editForm.hasCombinations === val ? "#fff" : C.mid,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {editForm.hasCombinations && (
              <div
                className="p-3 rounded-xl"
                style={{
                  background: "rgba(136,189,242,0.07)",
                  border: `1px dashed rgba(136,189,242,0.4)`,
                }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: C.mid }}>
                  GROUPS
                </p>
                <div className="flex flex-col gap-1.5 mb-2">
                  {combinations.map((combo) => (
                    <CombinationRow
                      key={combo.id}
                      combination={combo}
                      streamId={stream.id}
                      onDelete={handleDeleteCombo}
                      onUpdate={(u) =>
                        setCombinations((prev) =>
                          prev.map((c) => (c.id === u.id ? u : c)),
                        )
                      }
                      setToast={setToast}
                    />
                  ))}
                  {combinations.length === 0 && (
                    <p className="text-xs py-1" style={{ color: C.mid }}>
                      No groups yet
                    </p>
                  )}
                </div>
                <AddComboRow
                  streamId={stream.id}
                  onAdded={(combo) =>
                    setCombinations((prev) => [...prev, combo])
                  }
                  setToast={setToast}
                />
              </div>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setEditing(false)}
                style={{
                  padding: "6px 12px",
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 8,
                  color: C.mid,
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                style={{
                  padding: "6px 14px",
                  background: C.primary,
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {savingEdit ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Check size={12} />
                )}{" "}
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                style={{ background: colors.bg, color: colors.color }}
              >
                {stream.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p
                    className="text-sm font-semibold"
                    style={{ color: C.primary }}
                  >
                    {stream.name}
                  </p>
                  {stream.code && (
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: colors.bg, color: colors.color }}
                    >
                      {stream.code}
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: C.mid }}>
                  {stream.hasCombinations
                    ? `${combinations.length} Group${combinations.length !== 1 ? "s" : ""}`
                    : "No Groups"}
                  {" • "}
                  {stream._count?.classSections || 0} sections
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditing(true)}
                style={{
                  border: "none",
                  background: C.pale,
                  borderRadius: 8,
                  padding: "6px 8px",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <Pencil size={13} style={{ color: C.mid }} />
              </button>
              <button
                onClick={() => onDelete(stream.id)}
                style={{
                  border: "none",
                  background: "rgba(239,68,68,0.07)",
                  borderRadius: 8,
                  padding: "6px 8px",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <Trash2 size={13} style={{ color: "#ef4444" }} />
              </button>
              {stream.hasCombinations && (
                <button
                  onClick={() => setExpanded((p) => !p)}
                  style={{
                    border: "none",
                    background: C.pale,
                    borderRadius: 8,
                    padding: "6px 8px",
                    cursor: "pointer",
                    display: "flex",
                  }}
                >
                  {expanded ? (
                    <ChevronDown size={13} style={{ color: C.mid }} />
                  ) : (
                    <ChevronRight size={13} style={{ color: C.mid }} />
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expanded groups panel */}
      {!editing && expanded && stream.hasCombinations && (
        <div
          className="px-5 pb-4 border-t space-y-2"
          style={{ borderColor: C.border, paddingTop: 12 }}
        >
          <p className="text-xs font-bold mb-2" style={{ color: C.mid }}>
            GROUPS / COMBINATIONS
          </p>
          {combinations.length === 0 && (
            <p className="text-xs py-2" style={{ color: C.mid }}>
              No groups yet
            </p>
          )}
          {combinations.map((combo) => (
            <CombinationRow
              key={combo.id}
              combination={combo}
              streamId={stream.id}
              onDelete={handleDeleteCombo}
              onUpdate={(u) =>
                setCombinations((prev) =>
                  prev.map((c) => (c.id === u.id ? u : c)),
                )
              }
              setToast={setToast}
            />
          ))}
          <AddComboRow
            streamId={stream.id}
            onAdded={(combo) => setCombinations((prev) => [...prev, combo])}
            setToast={setToast}
          />
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StreamsPage() {
  const navigate = useNavigate();
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    hasCombinations: false,
  });

  // For new stream — list of group names (no code)
  const [newCombos, setNewCombos] = useState([]);
  const [comboName, setComboName] = useState("");
  const comboInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchStreams();
      setStreams(res.streams || []);
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm({ name: "", code: "", hasCombinations: false });
    setNewCombos([]);
    setComboName("");
    setShowForm(false);
  };

  const addComboToList = () => {
    const trimmed = comboName.trim();
    if (!trimmed) return;
    setNewCombos((p) => [...p, trimmed]);
    setComboName("");
    // keep focus in the same input
    setTimeout(() => comboInputRef.current?.focus(), 10);
  };

  const handleCreate = async () => {
    if (!form.name.trim())
      return setToast({ type: "error", msg: "Stream name is required" });
    if (form.hasCombinations && newCombos.length === 0)
      return setToast({
        type: "error",
        msg: "Add at least one group, or select No Groups",
      });

    setSaving(true);
    try {
      const res = await createStream({
        name: form.name.trim(),
        code: form.code.trim() || null,
        hasCombinations: form.hasCombinations,
      });
      const created = { ...res.stream, combinations: [] };
      const createdCombos = [];
      for (const name of newCombos) {
        try {
          const cr = await createCombination(created.id, { name });
          createdCombos.push(cr.combination);
        } catch (_) {}
      }
      setStreams((prev) => [
        ...prev,
        { ...created, combinations: createdCombos },
      ]);
      setToast({ type: "success", msg: "Stream created" });
      resetForm();
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this stream?")) return;
    try {
      await deleteStream(id);
      setStreams((prev) => prev.filter((s) => s.id !== id));
      setToast({ type: "success", msg: "Stream deleted" });
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    }
  };

  return (
    <PageLayout>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              style={{
                border: "none",
                background: C.pale,
                borderRadius: 10,
                padding: "8px 10px",
                cursor: "pointer",
                display: "flex",
              }}
            >
              <ArrowLeft size={16} style={{ color: C.primary }} />
            </button>
            <div>
              <h1 className="text-xl font-bold" style={{ color: C.primary }}>
                Streams
              </h1>
              <p className="text-sm" style={{ color: C.mid }}>
                Manage PUC streams and their subject groups
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 text-sm font-bold text-white rounded-xl"
            style={{
              padding: "9px 18px",
              background: C.primary,
              border: "none",
              cursor: "pointer",
            }}
          >
            <Plus size={14} /> Add Stream
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div
            className="rounded-2xl shadow-sm p-5 mb-5"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold" style={{ color: C.primary }}>
                New Stream
              </h2>
              <button
                onClick={resetForm}
                style={{
                  border: "none",
                  background: C.pale,
                  borderRadius: 8,
                  padding: 6,
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={14} style={{ color: C.mid }} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.mid,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Stream Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Science, Commerce, Arts"
                  style={IS}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.mid,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Code (optional)
                </label>
                <input
                  value={form.code}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, code: e.target.value }))
                  }
                  placeholder="e.g. SCI, COM"
                  style={IS}
                />
              </div>
            </div>

            <div className="mb-4">
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.mid,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Does this stream have subject groups / combinations?
              </label>
              <div className="flex gap-2 flex-wrap">
                {[
                  {
                    val: true,
                    label: "Yes — has groups (e.g. PCMB, PCMC, CEBA)",
                  },
                  { val: false, label: "No groups (direct sections)" },
                ].map(({ val, label }) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => {
                      setForm((p) => ({ ...p, hasCombinations: val }));
                      setNewCombos([]);
                      setComboName("");
                    }}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 9,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: `1.5px solid ${form.hasCombinations === val ? C.primary : "rgba(136,189,242,0.4)"}`,
                      background:
                        form.hasCombinations === val
                          ? C.primary
                          : "transparent",
                      color: form.hasCombinations === val ? "#fff" : C.mid,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Groups section — NO code field */}
            {form.hasCombinations && (
              <div
                className="mb-4 p-3 rounded-xl"
                style={{
                  background: "rgba(136,189,242,0.07)",
                  border: `1px dashed rgba(136,189,242,0.4)`,
                }}
              >
                <p className="text-xs font-bold mb-3" style={{ color: C.mid }}>
                  GROUPS / COMBINATIONS{" "}
                  <span style={{ color: "#ef4444" }}>*</span>
                </p>

                {/* Added combos list */}
                {newCombos.length > 0 && (
                  <div className="flex flex-col gap-1.5 mb-3">
                    {newCombos.map((name, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg"
                        style={{
                          background: "#fff",
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        <GitBranch size={12} style={{ color: C.mid }} />
                        <span
                          className="text-sm font-medium flex-1"
                          style={{ color: C.primary }}
                        >
                          {name}
                        </span>
                        <button
                          onClick={() =>
                            setNewCombos((p) => p.filter((_, j) => j !== i))
                          }
                          style={{
                            border: "none",
                            background: "rgba(239,68,68,0.08)",
                            borderRadius: 6,
                            padding: "3px 6px",
                            cursor: "pointer",
                            display: "flex",
                          }}
                        >
                          <X size={11} style={{ color: "#ef4444" }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Single input — group name only, NO code box */}
                <div className="flex items-center gap-2">
                  <input
                    ref={comboInputRef}
                    value={comboName}
                    onChange={(e) => setComboName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addComboToList();
                      }
                    }}
                    placeholder="Group name (e.g. PCMB, CEBA, HEP) — press Enter to add"
                    style={{ ...IS, flex: 1 }}
                  />
                  <button
                    onClick={addComboToList}
                    style={{
                      border: "none",
                      background: C.primary,
                      borderRadius: 8,
                      padding: "8px 14px",
                      cursor: "pointer",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    + Add
                  </button>
                </div>
                <p className="text-xs mt-2" style={{ color: C.light }}>
                  Press Enter or click + Add. You can also add more groups
                  later.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={resetForm}
                style={{
                  padding: "8px 16px",
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 10,
                  color: C.mid,
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex items-center gap-2 text-sm font-semibold text-white rounded-xl"
                style={{
                  padding: "8px 18px",
                  background: C.primary,
                  border: "none",
                  cursor: "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {saving ? "Creating…" : "Create Stream"}
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2
              size={24}
              className="animate-spin"
              style={{ color: C.light }}
            />
          </div>
        ) : streams.length === 0 ? (
          <div
            className="rounded-2xl flex flex-col items-center gap-2 py-16"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <Waves size={32} style={{ color: C.light }} />
            <p className="text-sm font-medium" style={{ color: C.mid }}>
              No streams yet
            </p>
            <p className="text-xs" style={{ color: C.light }}>
              Add streams like Science, Commerce, Arts
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {streams.map((stream) => (
              <StreamCard
                key={stream.id}
                stream={stream}
                onDelete={handleDelete}
                onUpdate={(updated) =>
                  setStreams((prev) =>
                    prev.map((s) =>
                      s.id === updated.id ? { ...s, ...updated } : s,
                    ),
                  )
                }
                setToast={setToast}
              />
            ))}
          </div>
        )}
      </div>

      {toast && (
        <Toast
          type={toast.type}
          msg={toast.msg}
          onClose={() => setToast(null)}
        />
      )}
    </PageLayout>
  );
}
