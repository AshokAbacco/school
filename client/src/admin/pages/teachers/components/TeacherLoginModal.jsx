// client/src/admin/pages/teachers/components/TeacherLoginModal.jsx  (NEW)
// Create a login for an existing teacher, or change email / reset password.
import React, { useState, useEffect } from "react";
import { X, Eye, EyeOff, Check, Loader2, KeyRound } from "lucide-react";
import { setTeacherLogin } from "../api/teachersApi.js";

const F = { fontFamily: "'Inter', sans-serif" };

const inputBase = {
  ...F,
  width: "100%",
  padding: "9px 12px",
  border: "1.5px solid #E8F0F9",
  borderRadius: 10,
  fontSize: 13,
  color: "#1a2733",
  background: "#F4F8FD",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};
const focusOn = (e) => {
  e.target.style.borderColor = "#88BDF2";
  e.target.style.boxShadow = "0 0 0 3px rgba(136,189,242,0.12)";
};
const focusOff = (e) => {
  e.target.style.borderColor = "#E8F0F9";
  e.target.style.boxShadow = "none";
};

function Field({ label, required, children, error, hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label
        style={{
          ...F,
          fontSize: 10,
          fontWeight: 700,
          color: "#6A89A7",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
        {required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      {children}
      {error ? (
        <span style={{ ...F, fontSize: 11, color: "#dc2626" }}>{error}</span>
      ) : hint ? (
        <span style={{ ...F, fontSize: 11, color: "#9BBACF" }}>{hint}</span>
      ) : null}
    </div>
  );
}

export default function TeacherLoginModal({ teacher, onClose, onSaved }) {
  const hasLogin = !!teacher?.user?.email;
  const [email, setEmail] = useState(teacher?.user?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const h = (e) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, saving]);

  const validate = () => {
    const e = {};
    const em = email.trim();
    if (!em) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))
      e.email = "Invalid email format";

    // New login → password required. Existing login → password optional (only to reset).
    if (!hasLogin && !password) e.password = "Password is required";
    if (password && password.length < 6) e.password = "Minimum 6 characters";
    if (password && password !== confirm) e.confirm = "Passwords do not match";

    if (
      hasLogin &&
      !password &&
      em.toLowerCase() === (teacher.user.email || "").toLowerCase()
    ) {
      e.form = "Nothing to change — enter a new email or a new password.";
    }
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setApiError("");
    try {
      await setTeacherLogin(teacher.id, {
        email: email.trim().toLowerCase(),
        ...(password ? { password } : {}),
      });
      setDone(true);
      onSaved?.();
    } catch (err) {
      setApiError(err.message || "Failed to save login");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 210,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(26,39,51,0.45)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          borderRadius: 18,
          border: "1.5px solid #E8F0F9",
          boxShadow: "0 28px 80px rgba(26,39,51,0.22)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1.5px solid #F0F6FD",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "#EDF3FA",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <KeyRound size={16} color="#384959" />
            </div>
            <div>
              <h3
                style={{
                  ...F,
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#1a2733",
                }}
              >
                {hasLogin ? "Update Login" : "Create Login"}
              </h3>
              <p
                style={{
                  ...F,
                  margin: "2px 0 0",
                  fontSize: 11,
                  color: "#6A89A7",
                }}
              >
                {teacher.firstName} {teacher.lastName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              border: "1.5px solid #E8F0F9",
              background: "#F4F8FD",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#6A89A7",
            }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {done ? (
            <div
              style={{
                padding: "18px 14px",
                borderRadius: 12,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                textAlign: "center",
              }}
            >
              <Check size={26} color="#16a34a" />
              <p
                style={{
                  ...F,
                  margin: "8px 0 4px",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#15803d",
                }}
              >
                {hasLogin ? "Login updated" : "Login created"}
              </p>
              <p style={{ ...F, margin: 0, fontSize: 12, color: "#166534" }}>
                The teacher can now sign in with{" "}
                <strong>{email.trim().toLowerCase()}</strong>
                {password ? " and the new password." : "."}
              </p>
            </div>
          ) : (
            <>
              <div
                style={{
                  ...F,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: hasLogin ? "#F4F8FD" : "#fffbeb",
                  border: `1px solid ${hasLogin ? "#E8F0F9" : "#fde68a"}`,
                  fontSize: 12,
                  color: hasLogin ? "#6A89A7" : "#92400e",
                }}
              >
                {hasLogin
                  ? "This teacher already has a login. Change the email, or enter a new password to reset it."
                  : "This teacher has no login yet. Set an email and password they will use to sign in."}
              </div>

              {(apiError || errors.form) && (
                <div
                  style={{
                    ...F,
                    padding: "9px 12px",
                    borderRadius: 10,
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#b91c1c",
                    fontSize: 12,
                  }}
                >
                  ⚠ {apiError || errors.form}
                </div>
              )}

              <Field label="Login Email" required error={errors.email}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@school.com"
                  style={{
                    ...inputBase,
                    borderColor: errors.email ? "#f87171" : "#E8F0F9",
                  }}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
              </Field>

              <Field
                label={hasLogin ? "New Password" : "Password"}
                required={!hasLogin}
                error={errors.password}
                hint={
                  hasLogin
                    ? "Leave blank to keep the current password"
                    : "Minimum 6 characters"
                }
              >
                <div style={{ position: "relative" }}>
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      hasLogin ? "Enter new password" : "Set a password"
                    }
                    style={{
                      ...inputBase,
                      paddingRight: 38,
                      borderColor: errors.password ? "#f87171" : "#E8F0F9",
                    }}
                    onFocus={focusOn}
                    onBlur={focusOff}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#6A89A7",
                      display: "flex",
                    }}
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>

              {(password || !hasLogin) && (
                <Field label="Confirm Password" required error={errors.confirm}>
                  <input
                    type={showPwd ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    style={{
                      ...inputBase,
                      borderColor: errors.confirm ? "#f87171" : "#E8F0F9",
                    }}
                    onFocus={focusOn}
                    onBlur={focusOff}
                  />
                </Field>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            padding: "12px 20px",
            borderTop: "1.5px solid #F0F6FD",
          }}
        >
          {done ? (
            <button
              onClick={onClose}
              style={{
                ...F,
                fontSize: 13,
                fontWeight: 700,
                padding: "9px 20px",
                borderRadius: 11,
                background: "#15803d",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={saving}
                style={{
                  ...F,
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "9px 16px",
                  borderRadius: 11,
                  background: "#F4F8FD",
                  color: "#6A89A7",
                  border: "1.5px solid #E8F0F9",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  ...F,
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "9px 20px",
                  borderRadius: 11,
                  background: "#384959",
                  color: "#fff",
                  border: "none",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {saving ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                {hasLogin ? "Save Changes" : "Create Login"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
