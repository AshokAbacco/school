// client/src/admin/pages/Staff/components/StaffAdd.jsx
// Stormy Morning palette — matches Dashboard / ActivitiesPage design language

import { useState, useEffect } from "react";
import { X, UserPlus, FlaskConical, Home, KeyRound, Info, Loader2 } from "lucide-react";
import { createStaff, updateStaff } from "../api/api";

/* ── Design tokens ── */
const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2", deep: "#384959",
  deepDark: "#243340",
  bg: "#EDF3FA", white: "#FFFFFF", border: "#C8DCF0", borderLight: "#DDE9F5",
  text: "#243340", textMid: "#4A6880", textLight: "#6A89A7",
  success: "#3DA882",
};

const GROUP_CONFIG = {
  "Group B": {
    note: "Skilled / semi-skilled staff assisting in academic or lab functions.",
    roles: ["Lab Assistant", "Librarian", "Computer Operator", "Office Clerk"],
    icon: FlaskConical,
    accentBg: `${C.sky}15`,
    accentBorder: `${C.sky}44`,
    accentText: C.slate,
  },
  "Group C": {
    note: "General support staff for maintenance, security and daily upkeep.",
    roles: ["Peon", "Watchman", "Sweeper", "Gardner"],
    icon: Home,
    accentBg: `${C.mist}55`,
    accentBorder: C.border,
    accentText: C.deep,
  },
};

/* ── Shared input style helpers ── */
const inputStyle = {
  width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 12,
  padding: "9px 13px", fontSize: 13, fontWeight: 500, color: C.text,
  background: C.bg, outline: "none", boxSizing: "border-box",
  fontFamily: "'Inter', sans-serif", transition: "border-color 0.15s",
};

function Label({ children, required }) {
  return (
    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textLight, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "'Inter', sans-serif" }}>
      {children} {required && <span style={{ color: C.sky }}>*</span>}
    </label>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      {children}
    </div>
  );
}

function StormInput({ name, value, onChange, placeholder, type = "text" }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      name={name} value={value} onChange={onChange}
      placeholder={placeholder} type={type}
      style={{ ...inputStyle, borderColor: focused ? C.sky : C.border, background: focused ? C.white : C.bg }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

/* ── Section divider ── */
function SectionTitle({ children, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <div style={{ flex: 1, height: 1, background: C.borderLight }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" }}>
        {children}
        {sub && <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, marginLeft: 4 }}>{sub}</span>}
      </span>
      <div style={{ flex: 1, height: 1, background: C.borderLight }} />
    </div>
  );
}

/* ══════════════════════════════════════════
   STAFFADD — modal
══════════════════════════════════════════ */
export default function StaffAdd({ onClose, onSuccess, editData = null }) {
  const isEdit = !!editData;

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    password: "", role: "", groupType: "Group B",
    joiningDate: "", basicSalary: "",
    bankAccountNo: "", bankName: "", ifscCode: "",
  });
  const [loading, setLoading]     = useState(false);
  const [giveLogin, setGiveLogin] = useState(false);

  useEffect(() => {
    if (editData) {
      setForm({
        firstName:     editData.firstName     || "",
        lastName:      editData.lastName      || "",
        email:         editData.email         || "",
        phone:         editData.phone         || "",
        password:      "",
        role:          editData.role          || "",
        groupType:     editData.groupType     || "Group B",
        joiningDate:   editData.joiningDate?.split("T")[0] || "",
        basicSalary:   editData.basicSalary   ?? "",
        bankAccountNo: editData.bankAccountNo || "",
        bankName:      editData.bankName      || "",
        ifscCode:      editData.ifscCode      || "",
      });
      if (editData.email) setGiveLogin(true);
    }
  }, [editData]);

  const set  = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const setG = (g) => setForm(f => ({ ...f, groupType: g, role: "" }));
  const setR = (r) => setForm(f => ({ ...f, role: f.role === r ? "" : r }));

  const handleSubmit = async () => {
    if (!form.firstName || !form.role || !form.joiningDate)
      return alert("First Name, Role and Joining Date are required");
    if (!isEdit && giveLogin && !form.email)
      return alert("Email is required when giving login access");
    if (!isEdit && giveLogin && !form.password)
      return alert("Password is required when giving login access");

    setLoading(true);
    try {
      if (isEdit) {
        await updateStaff(editData.id, {
          firstName: form.firstName, lastName: form.lastName || "",
          phone: form.phone || null, email: form.email || null,
          role: form.role, groupType: form.groupType,
          basicSalary: form.basicSalary ? Number(form.basicSalary) : null,
          joiningDate: form.joiningDate,
          bankAccountNo: form.bankAccountNo || null,
          bankName: form.bankName || null, ifscCode: form.ifscCode || null,
        });
      } else {
        await createStaff({
          firstName: form.firstName, lastName: form.lastName || "",
          phone: form.phone || undefined, email: form.email || undefined,
          role: form.role, groupType: form.groupType,
          joiningDate: form.joiningDate,
          basicSalary: form.basicSalary || undefined,
          bankAccountNo: form.bankAccountNo || undefined,
          bankName: form.bankName || undefined, ifscCode: form.ifscCode || undefined,
          ...(giveLogin && { password: form.password }),
        });
      }
      onSuccess(); onClose();
    } catch (err) {
      alert(err.message || "Failed to save staff");
    } finally {
      setLoading(false);
    }
  };

  const cfg = GROUP_CONFIG[form.groupType];
  const GrpIcon = cfg.icon;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .staff-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 480px) { .staff-2col { grid-template-columns: 1fr; } }
      `}</style>

      {/* Backdrop */}
      <div style={{ position: "fixed", inset: 0, background: "rgba(36,51,64,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>

        {/* Modal */}
        <div style={{ background: C.white, borderRadius: 22, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 24px 64px rgba(56,73,89,0.22)", width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto", fontFamily: "'Inter', sans-serif" }} onClick={e => e.stopPropagation()}>

          {/* ── Header — sticky ── */}
          <div style={{ padding: "18px 22px", borderBottom: `1.5px solid ${C.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: C.white, zIndex: 10, borderRadius: "22px 22px 0 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: `${C.sky}22`, border: `1.5px solid ${C.sky}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <UserPlus size={16} color={C.sky} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: C.text }}>{isEdit ? "Edit Staff" : "Add Staff"}</p>
                <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{isEdit ? "Update staff member details" : "Create a new staff entry"}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textLight }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.sky}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <X size={14} />
            </button>
          </div>

          {/* ── Body ── */}
          <div style={{ padding: "22px 22px", display: "flex", flexDirection: "column", gap: 22 }}>

            {/* ── Group Toggle ── */}
            <div>
              <SectionTitle>Staff Group</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                {Object.entries(GROUP_CONFIG).map(([g, gc]) => {
                  const active = form.groupType === g;
                  const GIcon = gc.icon;
                  return (
                    <button key={g} type="button" onClick={() => setG(g)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 14px", borderRadius: 13, border: `1.5px solid ${active ? C.deep : C.borderLight}`, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "'Inter', sans-serif", transition: "all 0.18s", background: active ? `linear-gradient(135deg, ${C.slate}, ${C.deep})` : C.bg, color: active ? "#fff" : C.textMid, boxShadow: active ? `0 4px 14px rgba(56,73,89,0.22)` : "none" }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = C.sky; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = C.borderLight; }}>
                      <GIcon size={14} color={active ? C.mist : C.textLight} />
                      {g}
                    </button>
                  );
                })}
              </div>
              {/* Group note */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, borderRadius: 12, border: `1.5px solid ${cfg.accentBorder}`, padding: "10px 13px", background: cfg.accentBg }}>
                <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} color={cfg.accentText} />
                <span style={{ fontSize: 12, color: cfg.accentText, lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
                  <strong>{form.groupType}:</strong> {cfg.note}
                </span>
              </div>
            </div>

            {/* ── Role Chips ── */}
            <div>
              <SectionTitle>Role <span style={{ fontWeight: 400, textTransform: "none", fontSize: 10 }}>— pick or type custom</span></SectionTitle>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
                {cfg.roles.map(r => {
                  const active = form.role === r;
                  return (
                    <button key={r} type="button" onClick={() => setR(r)}
                      style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${active ? C.deep : C.border}`, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'Inter', sans-serif", transition: "all 0.15s", background: active ? `linear-gradient(135deg, ${C.slate}, ${C.deep})` : C.white, color: active ? "#fff" : C.textMid }}
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = C.sky; e.currentTarget.style.color = C.sky; } }}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMid; } }}>
                      {r}
                    </button>
                  );
                })}
              </div>
              <StormInput name="role" value={form.role} onChange={set} placeholder="Or type a custom role…" />
            </div>

            {/* ── Personal Details ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SectionTitle>Personal Details</SectionTitle>
              <div className="staff-2col">
                <Field label="First Name" required><StormInput name="firstName" value={form.firstName} onChange={set} placeholder="First name" /></Field>
                <Field label="Last Name"><StormInput name="lastName" value={form.lastName} onChange={set} placeholder="Last name" /></Field>
              </div>
              <Field label="Email"><StormInput name="email" value={form.email} onChange={set} placeholder="staff@school.com" type="email" /></Field>
              <div className="staff-2col">
                <Field label="Phone"><StormInput name="phone" value={form.phone} onChange={set} placeholder="+91 XXXXX XXXXX" /></Field>
                <Field label="Joining Date" required><StormInput name="joiningDate" value={form.joiningDate} onChange={set} type="date" /></Field>
              </div>
            </div>

            {/* ── Salary & Bank ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SectionTitle>Salary &amp; Bank <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></SectionTitle>
              <Field label="Basic Salary (₹)"><StormInput name="basicSalary" value={form.basicSalary} onChange={set} placeholder="e.g. 18000" type="number" /></Field>
              <div className="staff-2col">
                <Field label="Bank Name"><StormInput name="bankName" value={form.bankName} onChange={set} placeholder="e.g. SBI" /></Field>
                <Field label="IFSC Code"><StormInput name="ifscCode" value={form.ifscCode} onChange={set} placeholder="e.g. SBIN0001234" /></Field>
              </div>
              <Field label="Bank Account No."><StormInput name="bankAccountNo" value={form.bankAccountNo} onChange={set} placeholder="Account number" /></Field>
            </div>

            {/* ── Login Access ── */}
            {/* {!isEdit && (
              <div style={{ borderRadius: 14, border: `1.5px dashed ${C.border}`, background: C.bg, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.sky}18`, border: `1.5px solid ${C.sky}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <KeyRound size={14} color={C.sky} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.text }}>Give Login Access?</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textLight }}>Staff can log in to the portal</p>
                    </div>
                  </div>
                  
                  <button type="button" onClick={() => setGiveLogin(v => !v)}
                    style={{ position: "relative", width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer", transition: "background 0.2s", background: giveLogin ? `linear-gradient(135deg, ${C.slate}, ${C.deep})` : C.border, flexShrink: 0 }}>
                    <span style={{ position: "absolute", top: 2, left: giveLogin ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.18)", transition: "left 0.2s" }} />
                  </button>
                </div>

                {giveLogin && (
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10, paddingTop: 14, borderTop: `1px solid ${C.borderLight}` }}>
                    <Field label="Password" required>
                      <StormInput name="password" value={form.password} onChange={set} placeholder="Set a password" type="password" />
                    </Field>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.slate, fontFamily: "'Inter', sans-serif" }}>
                      <Info size={11} color={C.sky} />
                      A user account will be created and linked automatically.
                    </div>
                  </div>
                )}
              </div>
            )} */}
          </div>

          {/* ── Footer ── */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 22px", borderTop: `1.5px solid ${C.borderLight}`, background: C.bg, borderRadius: "0 0 22px 22px", position: "sticky", bottom: 0 }}>
            <button onClick={onClose} disabled={loading}
              style={{ padding: "9px 20px", borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.white, fontSize: 13, color: C.textMid, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 24px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif", opacity: loading ? 0.7 : 1, boxShadow: "0 4px 14px rgba(56,73,89,0.22)" }}>
              {loading ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : isEdit ? "Update Staff" : "Add Staff"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}