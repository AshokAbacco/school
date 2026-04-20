// client/src/admin/pages/classes/ClassesList.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Clock,
  BookOpen,
  GraduationCap,
  Grid3X3,
  RefreshCw,
  Users,
  UserCog,
  Check,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Waves,
  Zap,
  Hash,
  ChevronDown,
} from "lucide-react";
import CreateAcademicYearModal from "./components/CreateAcademicYearModal";
import {
  fetchClassSections,
  deleteClassSection,
  fetchAcademicYears,
  activateClassForYear,
  fetchTeachersForDropdown,
  activateAcademicYear,
} from "./api/classesApi";
import { useInstitutionConfig } from "./hooks/useInstitutionConfig";
import GenerateRollNumberModal from "./components/GenerateRollNumberModal";

/* ── Design tokens ── */
const C = {
  slate: "#6A89A7",
  mist: "#BDDDFC",
  sky: "#88BDF2",
  deep: "#384959",
  bg: "#EDF3FA",
  white: "#FFFFFF",
  border: "#C8DCF0",
  borderLight: "#DDE9F5",
  text: "#243340",
  textLight: "#6A89A7",
};

/* ── Toast ── */
function Toast({ type, msg, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 18px",
        borderRadius: 14,
         fontFamily: "'Inter', sans-serif",
        background: type === "success" ? "#f0fdf4" : "#fef2f2",
        border: `1.5px solid ${type === "success" ? "#86efac" : "#fca5a5"}`,
        color: type === "success" ? "#15803d" : "#b91c1c",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 8px 28px rgba(56,73,89,0.13)",
      }}
    >
      {type === "success" ? (
        <CheckCircle2 size={15} />
      ) : (
        <AlertCircle size={15} />
      )}
      {msg}
    </div>
  );
}

/* ── Pulse skeleton ── */
function Pulse({ w = "100%", h = 13, r = 8 }) {
  return (
    <div
      className="animate-pulse"
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: `${C.mist}55`,
        flexShrink: 0,
      }}
    />
  );
}

/* ── Panel header ── */
function PanelHead({ title, sub, IconComp, iconColor = C.sky, right }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)`,
        borderBottom: `1.5px solid ${C.borderLight}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,           // ← ensures space between title and search
        flexWrap: "wrap",  // ← search drops below on very small screens
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {IconComp && (
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: `${C.sky}22`,
              border: `1.5px solid ${C.sky}33`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconComp size={15} color={iconColor} strokeWidth={2} />
          </div>
        )}
        <div>
          <p
            style={{
              margin: 0,
               fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              fontWeight: 700,
              color: C.text,
            }}
          >
            {title}
          </p>
          {sub && (
            <p
              style={{
                margin: 0,
                 fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                color: C.textLight,
                marginTop: 1,
              }}
            >
              {sub}
            </p>
          )}
        </div>
      </div>
      {right}
    </div>
  );
}

/* ── Stat card ── */
function StatCard({ title, value, sub, delay = 0 }) {
  return (
    <div
      className="fade-up"
      style={{
        animationDelay: `${delay}ms`,
        background: C.white,
        borderRadius: 18,
        border: `1.5px solid ${C.borderLight}`,
        boxShadow: "0 2px 16px rgba(56,73,89,0.06)",
        padding: "16px 18px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${C.sky}, ${C.slate})`,
          borderRadius: "18px 18px 0 0",
        }}
      />
      <p
        style={{
          margin: 0,
           fontFamily: "'Inter', sans-serif",
          fontSize: 10,
          fontWeight: 700,
          color: C.textLight,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 6,
        }}
      >
        {title}
      </p>
      <p
        style={{
          margin: 0,
           fontFamily: "'Inter', sans-serif",
          fontSize: 26,
          fontWeight: 800,
          color: C.text,
          lineHeight: 1,
          letterSpacing: "-0.8px",
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            margin: "4px 0 0",
             fontFamily: "'Inter', sans-serif",
            fontSize: 10,
            color: C.textLight,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

/* ── Setup quick card ── */
function QuickCard({ icon: Icon, title, desc, onClick, accent, badge, step }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%",
        position: "relative",
        background: hov ? `${accent}0a` : C.white,
        border: `1.5px solid ${hov ? accent + "55" : C.borderLight}`,
        borderRadius: 16,
        padding: "14px 14px 16px",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hov
          ? `0 8px 24px ${accent}1a`
          : "0 1px 8px rgba(56,73,89,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
         fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -9,
          left: -9,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 10,
          fontWeight: 800,
          boxShadow: `0 2px 8px ${accent}55`,
        }}
      >
        {step}
      </div>
      {badge && (
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            fontSize: 9,
            fontWeight: 700,
            background: accent + "1a",
            color: accent,
            padding: "2px 7px",
            borderRadius: 99,
            letterSpacing: "0.5px",
          }}
        >
          {badge}
        </span>
      )}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 11,
          background: hov ? accent + "1a" : `${C.mist}44`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${hov ? accent + "33" : C.borderLight}`,
          transition: "all 0.18s",
        }}
      >
        <Icon size={16} style={{ color: hov ? accent : C.textLight }} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text }}>
          {title}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 10, color: C.textLight }}>
          {desc}
        </p>
      </div>
    </button>
  );
}

/* ── Assign Teacher Modal ── */
function AssignTeacherModal({
  cls,
  yearId,
  years,
  teachers,
  onClose,
  onSaved,
}) {
  const link = cls.academicYearLinks?.[0];
  const [selectedTeacherId, setSelectedTeacherId] = useState(
    link?.classTeacher?.id || "",
  );
  const [selectedYearId, setSelectedYearId] = useState(
    link?.academicYear?.id || yearId || "",
  );
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredTeachers = teachers.filter((t) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
      t.department?.toLowerCase().includes(q) ||
      t.designation?.toLowerCase().includes(q)
    );
  });

  const handleSave = async () => {
    if (!selectedYearId) {
      setError("Select an academic year first");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await activateClassForYear(cls.id, {
        academicYearId: selectedYearId,
        classTeacherId: selectedTeacherId || null,
      });
      onSaved(selectedTeacherId, selectedYearId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedYearId) return;
    setSaving(true);
    setError("");
    try {
      await activateClassForYear(cls.id, {
        academicYearId: selectedYearId,
        classTeacherId: null,
      });
      onSaved(null, selectedYearId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(36,51,64,0.45)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: C.white,
          borderRadius: 22,
          border: `1.5px solid ${C.borderLight}`,
          boxShadow: "0 28px 72px rgba(56,73,89,0.22)",
          width: "min(480px,95vw)",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
           fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            background: `linear-gradient(90deg, ${C.bg}, ${C.white})`,
            borderBottom: `1.5px solid ${C.borderLight}`,
            borderRadius: "22px 22px 0 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 11,
                background: `${C.sky}22`,
                border: `1.5px solid ${C.sky}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserCog size={16} color={C.deep} />
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 800,
                  color: C.text,
                }}
              >
                Assign Class Teacher
              </p>
              <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>
                {cls.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              border: `1.5px solid ${C.borderLight}`,
              background: C.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: C.textLight,
            }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "20px 22px", flex: 1 }}>
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 12,
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                color: "#b91c1c",
                fontSize: 12,
                marginBottom: 14,
                 fontFamily: "'Inter', sans-serif",
              }}
            >
              <AlertCircle size={13} /> {error}
            </div>
          )}
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: "block",
                fontSize: 10,
                fontWeight: 700,
                color: C.textLight,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 7,
              }}
            >
              Academic Year
            </label>
            <div style={{ position: "relative" }}>
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                style={{
                  width: "100%",
                  appearance: "none",
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "10px 36px 10px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.text,
                  background: C.bg,
                  outline: "none",
                   fontFamily: "'Inter', sans-serif",
                }}
              >
                <option value="">Select year…</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                    {y.isActive ? " ✓ (Active)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: C.textLight,
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: C.textLight,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                Class Teacher
              </label>
              {selectedTeacherId && (
                <button
                  onClick={() => setSelectedTeacherId("")}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "none",
                    background: "transparent",
                    color: "#ef4444",
                     fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            <div
              onClick={() => setSelectedTeacherId("")}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                cursor: "pointer",
                marginBottom: 8,
                border: `1.5px solid ${!selectedTeacherId ? "#fca5a5" : C.borderLight}`,
                background: !selectedTeacherId ? "#fef2f2" : C.bg,
                display: "flex",
                alignItems: "center",
                gap: 10,
                transition: "all 0.12s",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: !selectedTeacherId ? "#fca5a5" : C.borderLight,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <X
                  size={13}
                  style={{
                    color: !selectedTeacherId ? "#b91c1c" : C.textLight,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: !selectedTeacherId ? "#b91c1c" : C.textLight,
                   fontFamily: "'Inter', sans-serif",
                }}
              >
                No class teacher
              </span>
              {!selectedTeacherId && (
                <Check
                  size={13}
                  style={{ color: "#b91c1c", marginLeft: "auto" }}
                />
              )}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 12,
                border: `1.5px solid ${C.border}`,
                background: C.white,
                marginBottom: 8,
              }}
            >
              <Search size={13} style={{ color: C.textLight, flexShrink: 0 }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or department…"
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: 12,
                  color: C.text,
                   fontFamily: "'Inter', sans-serif",
                  flex: 1,
                  background: "transparent",
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  <X size={11} style={{ color: C.textLight }} />
                </button>
              )}
            </div>
            {teachers.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  color: "#92400e",
                  fontSize: 12,
                   fontFamily: "'Inter', sans-serif",
                }}
              >
                <AlertCircle size={13} /> No active teachers found.
              </div>
            ) : filteredTeachers.length === 0 ? (
              <p
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  color: C.textLight,
                  padding: "16px 0",
                   fontFamily: "'Inter', sans-serif",
                }}
              >
                No teachers match "{search}"
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  maxHeight: 220,
                  overflowY: "auto",
                }}
              >
                {filteredTeachers.map((t) => {
                  const sel = selectedTeacherId === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTeacherId(t.id)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        cursor: "pointer",
                        border: `1.5px solid ${sel ? C.deep : C.borderLight}`,
                        background: sel ? `${C.mist}44` : C.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all 0.12s",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: sel ? `${C.slate}22` : `${C.sky}22`,
                            color: C.deep,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {t.firstName?.[0]}
                          {t.lastName?.[0]}
                        </div>
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 13,
                              fontWeight: 700,
                              color: C.text,
                               fontFamily: "'Inter', sans-serif",
                            }}
                          >
                            {t.firstName} {t.lastName}
                          </p>
                          <div
                            style={{
                              display: "flex",
                              gap: 5,
                              marginTop: 2,
                              flexWrap: "wrap",
                            }}
                          >
                            {t.department && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "1px 7px",
                                  borderRadius: 20,
                                  background: "rgba(79,70,229,0.1)",
                                  color: "#4f46e5",
                                }}
                              >
                                {t.department}
                              </span>
                            )}
                            {t.designation && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: C.textLight,
                                   fontFamily: "'Inter', sans-serif",
                                }}
                              >
                                {t.designation}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {sel && (
                        <Check
                          size={14}
                          style={{ color: C.deep, flexShrink: 0 }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 22px",
            borderTop: `1.5px solid ${C.borderLight}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div>
            {link?.classTeacher && (
              <button
                onClick={handleRemove}
                disabled={saving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  border: "1px solid #fca5a5",
                  borderRadius: 11,
                  cursor: saving ? "not-allowed" : "pointer",
                  background: "#fef2f2",
                  color: "#b91c1c",
                   fontFamily: "'Inter', sans-serif",
                }}
              >
                <X size={12} /> Remove Teacher
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: "9px 18px",
                border: `1.5px solid ${C.border}`,
                borderRadius: 12,
                color: C.textLight,
                background: C.bg,
                cursor: "pointer",
                 fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !selectedYearId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 22px",
                borderRadius: 12,
                border: "none",
                background:
                  saving || !selectedYearId
                    ? C.borderLight
                    : `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
                color: saving || !selectedYearId ? C.textLight : "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: saving || !selectedYearId ? "not-allowed" : "pointer",
                 fontFamily: "'Inter', sans-serif",
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Check size={13} /> Assign
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════ */
export default function ClassesList() {
  const navigate = useNavigate();
  const location = useLocation();
  const config = useInstitutionConfig();
  const { schoolType } = useInstitutionConfig();

  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [yearId, setYearId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [assignModal, setAssignModal] = useState(null);
  const [activatingYear, setActivatingYear] = useState(false);
  const [rollModal, setRollModal] = useState(null);

  const showRollNumbers = schoolType === "SCHOOL" || schoolType === "PUC";

  const load = useCallback(async (overrideYearId) => {
    const activeYearId = overrideYearId ?? yearId;
    setLoading(true);
    setError("");
    try {
      const [cd, yd, td] = await Promise.all([
        fetchClassSections(
          activeYearId ? { academicYearId: activeYearId } : {},
        ),
        fetchAcademicYears(),
        fetchTeachersForDropdown().catch(() => ({ data: [] })),
      ]);
      setClasses(cd.classSections || []);
      const yr = yd.academicYears || [];
      setYears(yr);
      setTeachers(td.teachers || td.data || []);
      if (!activeYearId) {
        const active = yr.find((y) => y.isActive);
        if (active) setYearId(active.id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load(yearId || undefined);
  }, [load, yearId, location.pathname, location.state]);

  const handleDelete = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;

    setDeleting(id);
    try {
      await deleteClassSection(id);
      setClasses((prev) => prev.filter((c) => c.id !== id));
      setToast({
        type: "success",
        msg: `"${name}" deleted successfully`,
      });
    } catch (err) {
      setToast({
        type: "error",
        msg: err.message || "Failed to delete class",
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleAssignSaved = (teacherId, savedYearId) => {
    const foundTeacher = teacherId
      ? teachers.find((t) => t.id === teacherId)
      : null;
    const foundYear = years.find((y) => y.id === savedYearId);
    setClasses((prev) =>
      prev.map((c) => {
        if (c.id !== assignModal.id) return c;
        const existingLinks = c.academicYearLinks || [];
        const linkIndex = existingLinks.findIndex(
          (l) => l.academicYear?.id === savedYearId,
        );
        const updatedLink = {
          ...(existingLinks[linkIndex] || {}),
          classTeacher: foundTeacher
            ? {
                id: foundTeacher.id,
                firstName: foundTeacher.firstName,
                lastName: foundTeacher.lastName,
                designation: foundTeacher.designation,
              }
            : null,
          academicYear: foundYear
            ? {
                id: foundYear.id,
                name: foundYear.name,
                isActive: foundYear.isActive,
              }
            : existingLinks[linkIndex]?.academicYear,
          isActive: true,
        };
        const newLinks =
          linkIndex >= 0
            ? existingLinks.map((l, i) => (i === linkIndex ? updatedLink : l))
            : [...existingLinks, updatedLink];
        return { ...c, academicYearLinks: newLinks };
      }),
    );
    setAssignModal(null);
    setToast({
      type: "success",
      msg: foundTeacher
        ? `${foundTeacher.firstName} ${foundTeacher.lastName} assigned as class teacher`
        : "Class teacher removed",
    });
  };

  const filtered = classes.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.academicYearLinks?.[0]?.classTeacher?.firstName
        ?.toLowerCase()
        .includes(search.toLowerCase()),
  );
  const totalStudents = classes.reduce(
    (sum, c) => sum + (c._count?.studentEnrollments || 0),
    0,
  );
  const activeYear = years.find((y) => y.id === yearId);

  const handleActivateYear = async () => {
    if (!yearId) return;
    const selected = years.find((y) => y.id === yearId);
    if (!selected) return;
    if (selected.isActive) {
      setToast({
        type: "success",
        msg: `${selected.name} is already the active year`,
      });
      return;
    }
    if (
      !window.confirm(
        `Set "${selected.name}" as the active academic year?\n\nThis will deactivate "${years.find((y) => y.isActive)?.name || "current year"}" and teachers will start seeing classes for ${selected.name}.`,
      )
    )
      return;
    setActivatingYear(true);
    try {
      await activateAcademicYear(yearId);
      setToast({
        type: "success",
        msg: `✓ ${selected.name} is now the active academic year`,
      });
      load(yearId);
    } catch (err) {
      setToast({
        type: "error",
        msg: err.message || "Failed to activate year",
      });
    } finally {
      setActivatingYear(false);
    }
  };

  const setupCards = [];
  let step = 1;
  setupCards.push({
    step: step++,
    icon: Clock,
    title: "School Timings",
    desc: "Periods & breaks",
    path: "/admin/classes/timings",
    accent: C.slate,
  });
  if (config.showStream)
    setupCards.push({
      step: step++,
      icon: Waves,
      title: "Manage Streams",
      desc: "Science, Commerce, Arts",
      path: "/admin/classes/streams",
      accent: "#6366f1",
      badge: "PUC",
    });
  if (config.showCourse)
    setupCards.push({
      step: step++,
      icon: BookOpen,
      title: "Manage Courses",
      desc: "BTech, BA, BCom + branches",
      path: "/admin/classes/courses",
      accent: "#10b981",
      badge: config.schoolType,
    });
  setupCards.push({
    step: step++,
    icon: GraduationCap,
    title: `Create ${config.gradesLabel}`,
    desc: `Add ${config.gradeLabel?.toLowerCase()}s & sections`,
    path: "/admin/classes/sections",
    accent: "#10b981",
  });
  setupCards.push({
    step: step++,
    icon: BookOpen,
    title: "Subjects",
    desc: "Add & assign to classes",
    path: "/admin/classes/subjects",
    accent: "#4f46e5",
  });
  setupCards.push({
    step: step++,
    icon: Grid3X3,
    title: "Timetable",
    desc: "Build timetables",
    path: "/admin/classes/timetable",
    accent: "#f59e0b",
  });
  setupCards.push({
    step: step++,
    icon: ArrowRight,
    title: "Promotion",
    desc: `Promote ${config.studentsLabel?.toLowerCase()}`,
    path: "/admin/classes/promotion",
    accent: "#8b5cf6",
  });
  if (config.hasReadmission)
    setupCards.push({
      step: step++,
      icon: GraduationCap,
      title: "Re-admission",
      desc: "Grade 7 re-admissions",
      path: "/admin/classes/readmission",
      accent: "#f59e0b",
      badge: "Grade 7",
    });

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.45s ease both; }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          padding: "28px 30px",
           fontFamily: "'Inter', sans-serif",
          backgroundImage: `radial-gradient(ellipse at 0% 0%, ${C.mist}40 0%, transparent 55%)`,
        }}
      >
        {/* ── Header ── */}
        <div className="fade-up" style={{ marginBottom: 26 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 5,
                }}
              >
                <div
                  style={{
                    width: 4,
                    height: 28,
                    borderRadius: 99,
                    background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`,
                    flexShrink: 0,
                  }}
                />
                <h1
                  style={{
                    margin: 0,
                    fontSize: "clamp(20px,4vw,28px)",
                    fontWeight: 900,
                    color: C.text,
                    letterSpacing: "-0.6px",
                  }}
                >
                  Classes &amp; Sections
                </h1>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  paddingLeft: 14,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: C.textLight,
                    fontWeight: 500,
                  }}
                >
                  Manage {config.gradeLabel?.toLowerCase()} structure, subjects
                  and timetables
                </p>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 9px",
                    borderRadius: 20,
                    background: C.deep,
                    color: C.mist,
                    letterSpacing: "0.04em",
                  }}
                >
                  {config.schoolType}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <div style={{ position: "relative" }}>
                <select
                  value={yearId}
                  onChange={(e) => setYearId(e.target.value)}
                  style={{
                    appearance: "none",
                    WebkitAppearance: "none",
                    border: `1.5px solid ${C.border}`,
                    borderRadius: 12,
                    padding: "9px 36px 9px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.text,
                    background: C.bg,
                    outline: "none",
                    cursor: "pointer",
                     fontFamily: "'Inter', sans-serif",
                    minWidth: 150,
                  }}
                >
                  <option value="">All years</option>
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                      {y.isActive ? " ✓" : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  style={{
                    position: "absolute",
                    right: 11,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: C.textLight,
                    pointerEvents: "none",
                  }}
                />
              </div>
              {yearId && !years.find((y) => y.id === yearId)?.isActive && (
                <button
                  onClick={handleActivateYear}
                  disabled={activatingYear}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "9px 14px",
                    borderRadius: 12,
                    background: "#dcfce7",
                    border: "1.5px solid #86efac",
                    color: "#15803d",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: activatingYear ? "not-allowed" : "pointer",
                     fontFamily: "'Inter', sans-serif",
                    opacity: activatingYear ? 0.7 : 1,
                  }}
                >
                  {activatingYear ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Zap size={13} />
                  )}
                  {activatingYear ? "Activating…" : "Set as Active"}
                </button>
              )}
              {yearId && years.find((y) => y.id === yearId)?.isActive && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "7px 13px",
                    borderRadius: 12,
                    background: "#f0fdf4",
                    border: "1.5px solid #86efac",
                    color: "#15803d",
                    fontSize: 12,
                    fontWeight: 700,
                     fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <Check size={12} /> Active
                </span>
              )}
              <button
                onClick={() => load(yearId || undefined)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  border: `1.5px solid ${C.borderLight}`,
                  background: C.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: C.textLight,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = `${C.mist}55`)
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = C.bg)}
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "9px 18px",
                  borderRadius: 13,
                  border: "none",
                  background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                   fontFamily: "'Inter', sans-serif",
                  boxShadow: `0 4px 14px ${C.deep}44`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                <Plus size={14} /> New Academic Year
              </button>
              {showRollNumbers && (
                <button
                  onClick={() => setRollModal({ mode: "bulk" })}
                  disabled={!yearId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "9px 14px",
                    borderRadius: 12,
                    border: `1.5px solid ${C.sky}55`,
                    background: C.bg,
                    color: C.deep,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: yearId ? "pointer" : "not-allowed",
                    opacity: yearId ? 1 : 0.5,
                     fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <Hash size={13} style={{ color: C.sky }} /> Roll Numbers
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Setup Flow ── */}
        <div
          className="fade-up"
          style={{ animationDelay: "40ms", marginBottom: 22 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 3,
                height: 14,
                borderRadius: 99,
                background: `${C.sky}99`,
              }}
            />
            <p
              style={{
                margin: 0,
                 fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                fontWeight: 700,
                color: C.textLight,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Setup Flow
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
            {setupCards.map((card) => (
              <QuickCard
                key={card.path}
                icon={card.icon}
                title={card.title}
                desc={card.desc}
                onClick={() => navigate(card.path)}
                accent={card.accent}
                badge={card.badge}
                step={card.step}
              />
            ))}
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <StatCard
            title={`Total ${config.gradesLabel}`}
            value={classes.length}
            delay={0}
          />
          <StatCard
            title="Total Students"
            value={totalStudents}
            sub="across all sections"
            delay={50}
          />
          <StatCard
            title="Academic Year"
            value={activeYear?.name || "All"}
            sub={activeYear?.isActive ? "Currently active" : ""}
            delay={100}
          />
          <StatCard
            title="Not Activated"
            value={classes.filter((c) => !c.academicYearLinks?.length).length}
            sub="need activation"
            delay={150}
          />
        </div>

        {/* ── Classes Panel ── */}
        <div
          className="fade-up"
          style={{
            animationDelay: "120ms",
            background: C.white,
            borderRadius: 20,
            border: `1.5px solid ${C.borderLight}`,
            boxShadow: "0 2px 20px rgba(56,73,89,0.07)",
            overflow: "hidden",
          }}
        >
          <PanelHead
            title={`${config.gradesLabel || "Classes"}`}
            sub={`${filtered.length} section${filtered.length !== 1 ? "s" : ""} found`}
            IconComp={GraduationCap}
            iconColor={C.sky}
           right={
            <div style={{ position: "relative", width: "min(240px, 38vw)" }}>
              <Search
                size={13}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: C.textLight,
                  pointerEvents: "none",
                }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                style={{
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "8px 32px 8px 32px",
                  fontSize: 12,
                  fontWeight: 500,
                  color: C.text,
                  background: C.bg,
                  outline: "none",
                  fontFamily: "'Inter', sans-serif",
                  width: "100%",         // ← fills parent instead of fixed 240px
                }}
                onFocus={(e) => (e.target.style.borderColor = C.sky)}
                onBlur={(e) => (e.target.style.borderColor = C.border)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: C.textLight,
                    padding: 0,
                    display: "flex",
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          }
          />

          {loading ? (
            <div
              style={{
                padding: "24px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 14 }}
                >
                  <Pulse w={42} h={42} r={12} />
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 7,
                    }}
                  >
                    <Pulse w="28%" h={12} />
                    <Pulse w="18%" h={10} />
                  </div>
                  <Pulse w={130} h={34} r={10} />
                  <Pulse w={55} h={22} r={20} />
                  <Pulse w={90} h={28} r={10} />
                </div>
              ))}
            </div>
          ) : error ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "56px 0",
                gap: 12,
              }}
            >
              <p
                style={{
                   fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  color: "#ef4444",
                  margin: 0,
                }}
              >
                {error}
              </p>
              <button
                onClick={load}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 18px",
                  borderRadius: 12,
                  border: `1.5px solid ${C.border}`,
                  background: C.bg,
                  color: C.text,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                   fontFamily: "'Inter', sans-serif",
                }}
              >
                <RefreshCw size={13} /> Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "56px 0",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background: `${C.sky}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${C.sky}33`,
                }}
              >
                <GraduationCap size={26} color={C.sky} strokeWidth={1.5} />
              </div>
              <p
                style={{
                   fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.text,
                  margin: 0,
                }}
              >
                {search
                  ? "No matching classes"
                  : `No ${config.gradeLabel?.toLowerCase()} sections yet`}
              </p>
              {!search && (
                <button
                  onClick={() => navigate(`/admin/classes/sections`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "9px 18px",
                    borderRadius: 12,
                    border: "none",
                    background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                     fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <Plus size={13} /> Create Sections
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block" style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                     fontFamily: "'Inter', sans-serif",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: `${C.bg}99`,
                        borderBottom: `1.5px solid ${C.borderLight}`,
                      }}
                    >
                      {[
                        "Class",
                        "Class Teacher",
                        "Students",
                        "Year",
                        "Status",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "11px 20px",
                            textAlign: "left",
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: C.textLight,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((cls, idx) => {
                      const link = cls.academicYearLinks?.[0];
                      const teacher = link?.classTeacher;
                      const students = cls._count?.studentEnrollments || 0;
                      const isActivated = !!link;
                      const rowBg = idx % 2 === 0 ? C.white : `${C.mist}12`;
                      return (
                        <tr
                          key={cls.id}
                          style={{
                            borderBottom: `1px solid ${C.borderLight}`,
                            background: rowBg,
                            transition: "background 0.1s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = `${C.sky}0d`)
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = rowBg)
                          }
                        >
                          <td style={{ padding: "13px 20px" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: 12,
                                  background: `linear-gradient(135deg, ${C.sky}22, ${C.mist}44)`,
                                  border: `1.5px solid ${C.borderLight}`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 800,
                                  fontSize: 11,
                                  color: C.deep,
                                  flexShrink: 0,
                                }}
                              >
                                {cls.grade?.replace(/\D/g, "")}
                                {cls.section ? cls.section.slice(0, 1) : ""}
                              </div>
                              <div>
                                <p
                                  style={{
                                    margin: 0,
                                    fontWeight: 700,
                                    color: C.text,
                                    fontSize: 13,
                                  }}
                                >
                                  {cls.name}
                                </p>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 4,
                                    flexWrap: "wrap",
                                    marginTop: 3,
                                  }}
                                >
                                  {cls.stream && (
                                    <span
                                      style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        padding: "1px 7px",
                                        borderRadius: 20,
                                        background: "rgba(99,102,241,0.1)",
                                        color: "#4f46e5",
                                      }}
                                    >
                                      {cls.stream.name}
                                    </span>
                                  )}
                                  {cls.combination && (
                                    <span
                                      style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        padding: "1px 7px",
                                        borderRadius: 20,
                                        background: "rgba(139,92,246,0.1)",
                                        color: "#7c3aed",
                                      }}
                                    >
                                      {cls.combination.name}
                                    </span>
                                  )}
                                  {cls.course && (
                                    <span
                                      style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        padding: "1px 7px",
                                        borderRadius: 20,
                                        background: "rgba(16,185,129,0.1)",
                                        color: "#065f46",
                                      }}
                                    >
                                      {cls.course.name}
                                    </span>
                                  )}
                                  {cls.branch && (
                                    <span
                                      style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        padding: "1px 7px",
                                        borderRadius: 20,
                                        background: "rgba(245,158,11,0.1)",
                                        color: "#92400e",
                                      }}
                                    >
                                      {cls.branch.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: "13px 20px" }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAssignModal(cls);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "7px 12px",
                                borderRadius: 11,
                                border: `1.5px dashed ${teacher ? C.borderLight : C.sky + "88"}`,
                                background: teacher ? C.bg : `${C.sky}0a`,
                                cursor: "pointer",
                                transition: "all 0.14s",
                                 fontFamily: "'Inter', sans-serif",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.borderColor = C.deep)
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.borderColor = teacher
                                  ? C.borderLight
                                  : C.sky + "88")
                              }
                            >
                              {teacher ? (
                                <>
                                  <div
                                    style={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: "50%",
                                      background: `${C.slate}22`,
                                      color: C.deep,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 10,
                                      fontWeight: 700,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {teacher.firstName?.[0]}
                                    {teacher.lastName?.[0]}
                                  </div>
                                  <span
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 600,
                                      color: C.text,
                                    }}
                                  >
                                    {teacher.firstName} {teacher.lastName}
                                  </span>
                                  <UserCog
                                    size={10}
                                    style={{ color: C.textLight }}
                                  />
                                </>
                              ) : (
                                <>
                                  <UserCog size={13} style={{ color: C.sky }} />
                                  <span
                                    style={{
                                      fontSize: 12,
                                      color: C.sky,
                                      fontWeight: 600,
                                    }}
                                  >
                                    Assign teacher
                                  </span>
                                </>
                              )}
                            </button>
                          </td>

                          <td style={{ padding: "13px 20px" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                              }}
                            >
                              <div
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 8,
                                  background: `${C.mist}44`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Users size={12} color={C.textLight} />
                              </div>
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: C.text,
                                }}
                              >
                                {students}
                              </span>
                            </div>
                          </td>

                          <td style={{ padding: "13px 20px" }}>
                            {link?.academicYear ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "4px 10px",
                                  borderRadius: 8,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: `${C.mist}55`,
                                  color: C.deep,
                                  border: `1px solid ${C.borderLight}`,
                                }}
                              >
                                {link.academicYear.name}
                              </span>
                            ) : (
                              <span
                                style={{ color: C.textLight, fontSize: 12 }}
                              >
                                —
                              </span>
                            )}
                          </td>

                          <td style={{ padding: "13px 20px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "4px 10px",
                                borderRadius: 20,
                                background: isActivated
                                  ? "rgba(16,185,129,0.10)"
                                  : `${C.sky}18`,
                                color: isActivated ? "#065f46" : C.textLight,
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: isActivated ? "#10b981" : C.sky,
                                  flexShrink: 0,
                                }}
                              />
                              {isActivated ? "Active" : "Not activated"}
                            </span>
                          </td>

                          <td style={{ padding: "13px 20px" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {[
                                {
                                  icon: Eye,
                                  title: "View",
                                  onClick: () =>
                                    navigate(`/admin/classes/${cls.id}/timetable`),
                                  color: C.textLight,
                                  hoverBg: `${C.sky}22`,
                                },
                                {
                                  icon: Edit,
                                  title: "Edit Timetable",
                                  onClick: () =>
                                    navigate(`/admin/classes/timetable`, {
                                      state: { sectionId: cls.id },
                                    }),
                                  color: C.textLight,
                                  hoverBg: `${C.sky}22`,
                                },
                                {
                                  icon: UserCog,
                                  title: "Assign Teacher",
                                  onClick: () => setAssignModal(cls),
                                  color: teacher ? C.deep : C.sky,
                                  hoverBg: `${C.sky}33`,
                                },
                              ].map(
                                ({
                                  icon: Icon,
                                  title,
                                  onClick,
                                  color,
                                  hoverBg,
                                }) => (
                                  <button
                                    key={title}
                                    onClick={onClick}
                                    title={title}
                                    style={{
                                      width: 30,
                                      height: 30,
                                      borderRadius: 9,
                                      border: `1px solid ${C.borderLight}`,
                                      background: C.bg,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                      color,
                                      transition: "all 0.12s",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background =
                                        hoverBg;
                                      e.currentTarget.style.borderColor =
                                        hoverBg;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = C.bg;
                                      e.currentTarget.style.borderColor =
                                        C.borderLight;
                                    }}
                                  >
                                    <Icon size={13} />
                                  </button>
                                ),
                              )}
                              {showRollNumbers && (
                                <button
                                  onClick={() =>
                                    setRollModal({ mode: "single", cls })
                                  }
                                  title="Generate Roll Numbers"
                                  disabled={!yearId || !isActivated}
                                  style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 9,
                                    border: `1px solid ${C.sky}33`,
                                    background: `${C.sky}12`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor:
                                      !yearId || !isActivated
                                        ? "not-allowed"
                                        : "pointer",
                                    color: C.sky,
                                    opacity: !yearId || !isActivated ? 0.4 : 1,
                                    transition: "all 0.12s",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (yearId && isActivated) {
                                      e.currentTarget.style.background = `${C.sky}30`;
                                      e.currentTarget.style.color = C.deep;
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = `${C.sky}12`;
                                    e.currentTarget.style.color = C.sky;
                                  }}
                                >
                                  <Hash size={13} />
                                </button>
                              )}
                              <button
                                onClick={(e) =>
                                  handleDelete(e, cls.id, cls.name)
                                }
                                disabled={deleting === cls.id}
                                title="Delete"
                                style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: 9,
                                  border: "1px solid #fca5a5",
                                  background: "#fef2f2",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor:
                                    deleting === cls.id
                                      ? "not-allowed"
                                      : "pointer",
                                  color: "#ef4444",
                                  transition: "background 0.12s",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background =
                                    "rgba(239,68,68,0.15)")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background = "#fef2f2")
                                }
                              >
                                {deleting === cls.id ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Trash2 size={13} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div
                className="md:hidden"
                style={{ borderTop: `1.5px solid ${C.borderLight}` }}
              >
                {filtered.map((cls) => {
                  const link = cls.academicYearLinks?.[0];
                  const teacher = link?.classTeacher;
                  const students = cls._count?.studentEnrollments || 0;
                  const isActivated = !!link;
                  return (
                    <div
                      key={cls.id}
                      style={{
                        padding: "14px 16px",
                        borderBottom: `1px solid ${C.borderLight}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          marginBottom: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            background: `linear-gradient(135deg, ${C.sky}22, ${C.mist}44)`,
                            border: `1.5px solid ${C.borderLight}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: 12,
                            color: C.deep,
                            flexShrink: 0,
                             fontFamily: "'Inter', sans-serif",
                          }}
                        >
                          {cls.grade?.replace(/\D/g, "")}
                          {cls.section ? cls.section.slice(0, 1) : ""}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                 fontFamily: "'Inter', sans-serif",
                                fontSize: 13,
                                fontWeight: 700,
                                color: C.text,
                              }}
                            >
                              {cls.name}
                            </p>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "3px 9px",
                                borderRadius: 20,
                                background: isActivated
                                  ? "rgba(16,185,129,0.1)"
                                  : `${C.sky}18`,
                                color: isActivated ? "#065f46" : C.textLight,
                              }}
                            >
                              <span
                                style={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: "50%",
                                  background: isActivated ? "#10b981" : C.sky,
                                }}
                              />
                              {isActivated ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              flexWrap: "wrap",
                              marginTop: 4,
                            }}
                          >
                            {cls.stream && (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  padding: "1px 7px",
                                  borderRadius: 20,
                                  background: "rgba(99,102,241,0.1)",
                                  color: "#4f46e5",
                                }}
                              >
                                {cls.stream.name}
                              </span>
                            )}
                            {cls.combination && (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  padding: "1px 7px",
                                  borderRadius: 20,
                                  background: "rgba(139,92,246,0.1)",
                                  color: "#7c3aed",
                                }}
                              >
                                {cls.combination.name}
                              </span>
                            )}
                            {cls.course && (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  padding: "1px 7px",
                                  borderRadius: 20,
                                  background: "rgba(16,185,129,0.1)",
                                  color: "#065f46",
                                }}
                              >
                                {cls.course.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 7,
                          marginBottom: 10,
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssignModal(cls);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 12px",
                            borderRadius: 10,
                            border: `1.5px dashed ${teacher ? C.borderLight : C.sky + "88"}`,
                            background: teacher ? C.bg : `${C.sky}0a`,
                            cursor: "pointer",
                             fontFamily: "'Inter', sans-serif",
                          }}
                        >
                          {teacher ? (
                            <>
                              <div
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: "50%",
                                  background: `${C.slate}22`,
                                  color: C.deep,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 9,
                                  fontWeight: 700,
                                }}
                              >
                                {teacher.firstName?.[0]}
                                {teacher.lastName?.[0]}
                              </div>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: C.text,
                                }}
                              >
                                {teacher.firstName} {teacher.lastName}
                              </span>
                            </>
                          ) : (
                            <>
                              <UserCog size={12} style={{ color: C.sky }} />
                              <span
                                style={{
                                  fontSize: 11,
                                  color: C.sky,
                                  fontWeight: 600,
                                }}
                              >
                                Assign teacher
                              </span>
                            </>
                          )}
                        </button>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "6px 12px",
                            borderRadius: 10,
                            background: `${C.mist}44`,
                            border: `1px solid ${C.borderLight}`,
                          }}
                        >
                          <Users size={11} style={{ color: C.textLight }} />
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: C.text,
                               fontFamily: "'Inter', sans-serif",
                            }}
                          >
                            {students}
                          </span>
                        </div>
                        {link?.academicYear && (
                          <span
                            style={{
                              display: "inline-flex",
                              padding: "6px 12px",
                              borderRadius: 10,
                              fontSize: 11,
                              fontWeight: 600,
                              background: `${C.mist}55`,
                              color: C.deep,
                              border: `1px solid ${C.borderLight}`,
                               fontFamily: "'Inter', sans-serif",
                            }}
                          >
                            {link.academicYear.name}
                          </span>
                        )}
                      </div>
                      <div
                        style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                      >
                        {[
                          {
                            label: "View",
                            onClick: (e) => {
                              e.stopPropagation();
                              navigate(`/admin/classes/${cls.id}/timetable`);
                            },
                            icon: Eye,
                          },
                          {
                            label: "Edit",
                            onClick: (e) => {
                              e.stopPropagation();
                              navigate(`/admin/classes/timetable`, {
                                state: { sectionId: cls.id },
                              });
                            },
                            icon: Edit,
                          },
                        ].map(({ label, icon: Icon, onClick }) => (
                          <button
                            key={label}
                            onClick={onClick}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "7px 14px",
                              borderRadius: 10,
                              border: `1.5px solid ${C.borderLight}`,
                              background: C.bg,
                              color: C.textLight,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                               fontFamily: "'Inter', sans-serif",
                            }}
                          >
                            <Icon size={12} /> {label}
                          </button>
                        ))}
                        {showRollNumbers && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRollModal({ mode: "single", cls });
                            }}
                            disabled={!yearId || !isActivated}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "7px 14px",
                              borderRadius: 10,
                              border: `1.5px solid ${C.sky}44`,
                              background: `${C.sky}12`,
                              color: C.deep,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor:
                                !yearId || !isActivated
                                  ? "not-allowed"
                                  : "pointer",
                              opacity: !yearId || !isActivated ? 0.4 : 1,
                               fontFamily: "'Inter', sans-serif",
                            }}
                          >
                            <Hash size={12} style={{ color: C.sky }} /> Roll #
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(e, cls.id, cls.name)}
                          disabled={deleting === cls.id}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            border: "1px solid #fca5a5",
                            background: "#fef2f2",
                            color: "#ef4444",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor:
                              deleting === cls.id ? "not-allowed" : "pointer",
                          }}
                        >
                          {deleting === cls.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {assignModal && (
        <AssignTeacherModal
          cls={assignModal}
          yearId={yearId}
          years={years}
          teachers={teachers}
          onClose={() => setAssignModal(null)}
          onSaved={handleAssignSaved}
        />
      )}
      {rollModal && (
        <GenerateRollNumberModal
          mode={rollModal.mode}
          cls={rollModal.cls}
          yearId={yearId}
          onClose={() => setRollModal(null)}
          onSuccess={(result) => {
            setRollModal(null);
            setToast({
              type: "success",
              msg:
                rollModal.mode === "bulk"
                  ? `✓ Roll numbers generated for ${result.totalSections} classes (${result.totalUpdated} students updated)`
                  : `✓ Roll numbers generated for ${result.section} (${result.updated} updated)`,
            });
            load(yearId);
          }}
        />
      )}
      <CreateAcademicYearModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={(newYear) => {
          setShowModal(false);
          load();
          setToast({
            type: "success",
            msg: `Academic year "${newYear.name}" created successfully`,
          });
        }}
      />
      {toast && (
        <Toast
          type={toast.type}
          msg={toast.msg}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}