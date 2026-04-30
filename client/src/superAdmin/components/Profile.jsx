import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Lock, Image as ImageIcon, ChevronRight } from "lucide-react";
import { getToken } from "../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const NAV_ITEMS = [
  { key: "basic",    label: "Basic information", icon: User  },
  { key: "password", label: "Change password",   icon: Lock  },
  { key: "logo",     label: "School logo",        icon: ImageIcon },
  { key: "delete",   label: "Delete Account",     icon: ChevronRight },
];

export default function Profile() {
  const navigate = useNavigate();
  const [displayLogo, setDisplayLogo] = useState(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [logoUrl, setLogoUrl] = useState(null);

  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [passwords, setPasswords] = useState({ newPassword: "", confirmPassword: "" });
  const [logo, setLogo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    fetchProfile();
    fetchLogo();
  }, []);

  useEffect(() => {
    if (logoUrl) {
      setDisplayLogo(`${logoUrl}?t=${Date.now()}`);
    }
  }, [logoUrl]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchLogo = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/superadmin/profile/logo`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      const data = await res.json();
      if (data?.logoUrl) setLogoUrl(data.logoUrl);
    } catch (err) {
      console.error("Logo fetch error:", err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/superadmin/profile`, { headers: authHeaders() });
      const data = await res.json();
      setForm({ name: data.name || "", email: data.email || "", phone: data.phone || "" });
    } catch {
      showToast("Failed to load profile", "error");
    }
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/superadmin/profile`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, phone: form.phone, email: form.email }),
      });
      if (!res.ok) throw new Error();
      showToast("Profile updated successfully");
    } catch {
      showToast("Failed to update profile", "error");
    }
    setSaving(false);
  };

  const handlePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword)
      return showToast("Passwords do not match", "error");
    if (passwords.newPassword.length < 6)
      return showToast("Password must be at least 6 characters", "error");
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/superadmin/profile/change-password`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: passwords.newPassword }),
      });
      if (!res.ok) throw new Error();
      showToast("Password updated successfully");
      setPasswords({ newPassword: "", confirmPassword: "" });
    } catch {
      showToast("Failed to update password", "error");
    }
    setSaving(false);
  };

  const handleLogoUpload = async () => {
    if (!logo) return showToast("Please select a file", "error");
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("logo", logo);
      const res = await fetch(`${API_URL}/api/superadmin/profile/upload-logo`, {
        method: "PUT",
        headers: authHeaders(),
        body: formData,
      });
      if (!res.ok) throw new Error();
      showToast("Logo uploaded successfully");
      await fetchLogo();
      setPreview(null);
      setLogo(null);
    } catch {
      showToast("Failed to upload logo", "error");
    }
    setSaving(false);
  };

  const handleSendOtp = async () => {
    setSendingOtp(true);
    try {
      const res = await fetch(`${API_URL}/api/superadmin/delete-account/send-otp`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      setOtpSent(true);
      showToast("OTP sent to your registered email");
    } catch {
      showToast("Failed to send OTP", "error");
    }
    setSendingOtp(false);
  };

  const handleResendOtp = async () => {
    setSendingOtp(true);
    try {
      const res = await fetch(`${API_URL}/api/superadmin/delete-account/send-otp`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      showToast("OTP resent to your registered email");
      setOtp("");
      setResendCooldown(30);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch {
      showToast("Failed to resend OTP", "error");
    }
    setSendingOtp(false);
  };

  const handleDeleteAccount = async () => {
    if (confirmationText !== "DELETE MY UNIVERSITY ACCOUNT"){
      return showToast("Please type the confirmation sentence correctly", "error");
    }
    if (!otp) {
      return showToast("Please enter OTP", "error");
    }

    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/superadmin/delete-account`, {
        method: "DELETE",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ otp, confirmationText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // ✅ Clear session and redirect immediately
      localStorage.clear();
      navigate("/login");
    } catch (err) {
      showToast(err.message || "Failed to deactivate account", "error");
    }
    setDeleting(false);
  };

  const initials = form.name
    ? form.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "SA";

  return (
    <div className="p-4 md:p-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow text-sm font-medium
          ${toast.type === "error"
            ? "bg-red-50 text-red-700 border border-red-200"
            : "bg-green-50 text-green-700 border border-green-200"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-800">My Profile</h1>
          <p className="text-sm text-gray-500">Manage your account and university settings</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">

        {/* Sidebar */}
        <div className="flex flex-col gap-4 w-full lg:w-64 flex-shrink-0">

          {/* Avatar card */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3 text-blue-700 font-semibold text-xl">
              {initials}
            </div>
            <p className="font-semibold text-gray-800 text-sm">{form.name || "Super Admin"}</p>
            <p className="text-xs text-gray-500 mt-1 truncate">{form.email}</p>
            <span className="inline-block mt-2 px-3 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
              Active
            </span>
          </div>

          {/* Nav */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            {NAV_ITEMS.map(({ key, label, icon: Icon }, i) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition
                  ${i > 0 ? "border-t border-gray-100" : ""}
                  ${activeTab === key
                    ? "border-l-2 border-blue-500 bg-blue-50 text-blue-600"
                    : "border-l-2 border-transparent text-gray-600 hover:bg-gray-50"
                  }`}
              >
                <Icon size={15} className={activeTab === key ? "text-blue-500" : "text-gray-400"} />
                <span className={`text-sm ${activeTab === key ? "font-medium" : ""}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 w-full">

          {/* Basic info */}
          {activeTab === "basic" && (
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <div className="border-b border-gray-100 pb-4 mb-5">
                <h2 className="text-sm font-semibold text-gray-800">Basic information</h2>
                <p className="text-xs text-gray-500 mt-1">Update your name and contact details</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Full name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Full name"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Phone number</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Phone number"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={handleUpdateProfile}
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          )}

          {/* Change password */}
          {activeTab === "password" && (
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <div className="border-b border-gray-100 pb-4 mb-5">
                <h2 className="text-sm font-semibold text-gray-800">Change password</h2>
                <p className="text-xs text-gray-500 mt-1">Choose a strong password of at least 6 characters</p>
              </div>
              <div className="max-w-sm space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">New password</label>
                  <input
                    type="password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Confirm password</label>
                  <input
                    type="password"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
                  />
                </div>
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-500 leading-relaxed">
                  Password must be at least 6 characters. Use a mix of letters and numbers for a stronger password.
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={handlePassword}
                  disabled={saving}
                  className="px-5 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 transition"
                >
                  {saving ? "Updating…" : "Update password"}
                </button>
              </div>
            </div>
          )}

          {/* School logo */}
          {activeTab === "logo" && (
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <div className="border-b border-gray-100 pb-4 mb-5">
                <h2 className="text-sm font-semibold text-gray-800">School logo</h2>
                <p className="text-xs text-gray-500 mt-1">Upload your school's logo — displayed across the portal</p>
              </div>
              <div className="flex items-start gap-5">
                <div className="w-24 h-24 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {preview ? (
                    <img src={preview} alt="logo preview" className="w-full h-full object-contain" />
                  ) : logoUrl ? (
                    <img src={logoUrl} alt="logo" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon size={28} className="text-gray-300" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-3">PNG, JPG or SVG. Recommended size 256×256px.</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      setLogo(file);
                      setPreview(URL.createObjectURL(file));
                    }}
                    className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-gray-200 file:text-xs file:bg-white file:text-gray-600 file:cursor-pointer hover:file:bg-gray-50"
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={handleLogoUpload}
                  disabled={saving || !logo}
                  className="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                >
                  {saving ? "Uploading…" : "Upload logo"}
                </button>
              </div>
            </div>
          )}

          {/* Deactivate Account */}
          {activeTab === "delete" && (
            <div className="bg-white border border-red-100 rounded-xl shadow-sm p-5">

              <div className="border-b border-red-100 pb-4 mb-5">
                <h2 className="text-sm font-semibold text-red-600">Deactivate Account</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Immediately suspends all university logins. Your data is preserved for 60 days.
                </p>
              </div>

              {/* ✅ Updated warning block */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-red-700 mb-2">⚠️ Before you proceed</p>
                <ul className="text-xs text-red-600 space-y-1.5 list-disc ml-4">
                  <li>All logins across your university— staff, students and parents — will be <strong>immediately suspended</strong></li>
                  <li>Your data will <strong>NOT</strong> be deleted right away; it is safely preserved for <strong>60 days</strong></li>
                  <li>After 60 days, all data will be <strong>permanently and automatically deleted</strong></li>
                  <li>
                    To restore access within 60 days, contact{" "}
                    <a
                      href="mailto:support@eduabaccotech.com"
                      className="underline font-medium"
                    >
                      support@eduabaccotech.com
                    </a>
                  </li>
                  <li>You will be <strong>logged out immediately</strong> after confirmation</li>
                </ul>
              </div>

              {!otpSent ? (
                <div className="mt-5">
                  <p className="text-xs text-gray-500 mb-3">
                    We will send a one-time password to your registered email address. The email will include a reminder about the 60-day grace period.
                  </p>
                  <button
                    onClick={handleSendOtp}
                    disabled={sendingOtp}
                    className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {sendingOtp ? "Sending OTP..." : "Send Verification OTP"}
                  </button>
                </div>
              ) : (
                <div className="mt-5 space-y-4">

                  {/* OTP sent notice + resend */}
                  <div className="flex items-start justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 gap-3">
                    <p className="text-xs text-amber-800 leading-relaxed">
                      OTP sent to your registered email. Your account will enter a <strong>60-day grace period</strong> before any permanent deletion. To cancel, contact{" "}
                      <a href="mailto:support@eduabaccotech.com" className="underline font-medium">
                        support@eduabaccotech.com
                      </a>
                    </p>
                    <button
                      onClick={handleResendOtp}
                      disabled={sendingOtp || resendCooldown > 0}
                      className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
                    >
                      {sendingOtp
                        ? "Sending..."
                        : resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : "Resend OTP"}
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Enter OTP</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Type exactly:{" "}
                      <span className="font-semibold text-red-600">DELETE MY UNIVERSITY ACCOUNT</span>
                    </label>
                    <input
                      type="text"
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      placeholder="Type confirmation text"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 transition"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
                    >
                      {deleting ? "Deactivating..." : "Deactivate & Logout"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}