// src/auth/ResetPassword.jsx
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

export default function ResetPassword() {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    const identifier =
        location.state?.identifier || localStorage.getItem("identifier");

    const handleReset = async () => {
        if (!password || !confirm) {
            setError("Please fill all fields");
            return;
        }

        if (password !== confirm) {
            setError("Passwords do not match");
            return;
        }

        try {
            await axios.post("http://localhost:5000/api/auth/reset-password", {
                identifier,
                newPassword: password,
            });

            alert("Password updated successfully");

            navigate("/login");

        } catch (err) {
            setError(err.response?.data?.message || "Error resetting password");
        }
    };

    const EyeIcon = ({ open }) => open ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );

    const passwordsMatch = password && confirm && password === confirm;
    const passwordMismatch = password && confirm && password !== confirm;

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700&display=swap');

                * { box-sizing: border-box; margin: 0; padding: 0; }

                .fp-root {
                    font-family: 'Inter', sans-serif;
                    min-height: 100vh;
                    background: linear-gradient(150deg, #C5D9E8 0%, #B2CCDC 45%, #A0BBCC 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                    position: relative;
                    overflow: hidden;
                }

                .fp-blob-1 {
                    position: absolute;
                    top: -120px;
                    right: -120px;
                    width: 420px;
                    height: 420px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(136,189,242,0.35) 0%, transparent 70%);
                    pointer-events: none;
                }
                .fp-blob-2 {
                    position: absolute;
                    bottom: -100px;
                    left: -80px;
                    width: 360px;
                    height: 360px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(56,73,89,0.18) 0%, transparent 70%);
                    pointer-events: none;
                }

                .fp-card {
                    background: rgba(255,255,255,0.92);
                    border-radius: 24px;
                    box-shadow: 0 24px 60px rgba(36,51,64,0.18), 0 2px 8px rgba(36,51,64,0.08);
                    width: 100%;
                    max-width: 420px;
                    overflow: hidden;
                    animation: cardUp 0.42s cubic-bezier(.22,1,.36,1) forwards;
                    opacity: 0;
                }

                @keyframes cardUp {
                    from { opacity: 0; transform: translateY(28px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                .fp-header {
                    background: linear-gradient(135deg, #243340, #384959);
                    padding: 28px 32px 24px;
                    position: relative;
                }

                .fp-logo-ring {
                    width: 52px;
                    height: 52px;
                    border-radius: 14px;
                    background: rgba(255,255,255,0.14);
                    border: 1.5px solid rgba(255,255,255,0.22);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 16px;
                }

                .fp-header-title {
                    font-family: 'Playfair Display', serif;
                    font-size: 22px;
                    font-weight: 700;
                    color: #fff;
                    margin-bottom: 5px;
                }

                .fp-header-sub {
                    font-size: 12px;
                    color: rgba(255,255,255,0.55);
                    line-height: 1.5;
                }

                .fp-header::after {
                    content: '';
                    position: absolute;
                    right: 24px;
                    top: 24px;
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    background: rgba(136,189,242,0.18);
                    border: 1px solid rgba(136,189,242,0.25);
                }

                .fp-body {
                    padding: 28px 32px 32px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .fp-field-label {
                    font-size: 11px;
                    font-weight: 700;
                    color: #6A89A7;
                    text-transform: uppercase;
                    letter-spacing: 0.6px;
                    margin-bottom: 7px;
                    display: block;
                }

                .fp-input-wrap {
                    position: relative;
                }

                .fp-input-icon {
                    position: absolute;
                    left: 13px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #6A89A7;
                    pointer-events: none;
                    display: flex;
                    align-items: center;
                }

                .fp-input {
                    width: 100%;
                    padding: 11px 40px 11px 38px;
                    border: 1.5px solid #DDE9F5;
                    border-radius: 10px;
                    font-size: 14px;
                    font-family: 'Inter', sans-serif;
                    color: #243340;
                    background: #EDF3FA;
                    outline: none;
                    transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
                }

                .fp-input::placeholder { color: #6A89A7; font-size: 13px; }

                .fp-input:focus {
                    border-color: #88BDF2;
                    background: #fff;
                    box-shadow: 0 0 0 3px rgba(136,189,242,0.18);
                }

                .fp-input-match {
                    border-color: rgba(34,197,94,0.5) !important;
                    background: rgba(34,197,94,0.04) !important;
                }

                .fp-input-error {
                    border-color: rgba(239,68,68,0.4) !important;
                }

                .fp-eye-btn {
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #6A89A7;
                    display: flex;
                    align-items: center;
                    padding: 2px;
                    transition: color 0.15s;
                }
                .fp-eye-btn:hover { color: #384959; }

                .fp-match-hint {
                    margin-top: 5px;
                    font-size: 11px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    animation: fadeIn 0.2s ease;
                }

                .fp-btn {
                    width: 100%;
                    padding: 13px;
                    border-radius: 10px;
                    border: none;
                    background: linear-gradient(135deg, #384959, #243340);
                    color: #fff;
                    font-size: 14px;
                    font-weight: 700;
                    font-family: 'Inter', sans-serif;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    box-shadow: 0 3px 12px rgba(36,51,64,0.28);
                    transition: opacity 0.15s, transform 0.15s;
                }

                .fp-btn:hover:not(:disabled) {
                    opacity: 0.88;
                    transform: translateY(-1px);
                }

                .fp-btn:disabled { opacity: 0.65; cursor: not-allowed; }

                .fp-message-error {
                    display: flex;
                    align-items: flex-start;
                    gap: 9px;
                    padding: 11px 14px;
                    border-radius: 10px;
                    font-size: 13px;
                    font-weight: 500;
                    line-height: 1.45;
                    animation: fadeIn 0.22s ease forwards;
                    background: rgba(239,68,68,0.08);
                    border: 1px solid rgba(239,68,68,0.22);
                    color: #b91c1c;
                }

                @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }

                .fp-divider {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #6A89A7;
                    font-size: 11px;
                    font-weight: 600;
                }
                .fp-divider::before, .fp-divider::after {
                    content: '';
                    flex: 1;
                    height: 1px;
                    background: #DDE9F5;
                }

                .fp-back-link {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    font-size: 13px;
                    font-weight: 600;
                    color: #384959;
                    cursor: pointer;
                    transition: color 0.15s;
                    background: none;
                    border: none;
                    font-family: 'Inter', sans-serif;
                    width: 100%;
                }
                .fp-back-link:hover { color: #88BDF2; }

                @media (max-width: 480px) {
                    .fp-header { padding: 22px 22px 20px; }
                    .fp-body { padding: 22px 22px 26px; }
                }
            `}</style>

            <div className="fp-root">
                <div className="fp-blob-1" />
                <div className="fp-blob-2" />

                <div className="fp-card">

                    {/* ── Header ── */}
                    <div className="fp-header">
                        <div className="fp-logo-ring">
                            {/* Key icon */}
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                            </svg>
                        </div>
                        <div className="fp-header-title">Reset Password</div>
                        <div className="fp-header-sub">
                            Create a strong new password.<br />
                            Make sure it's at least 8 characters long.
                        </div>
                    </div>

                    {/* ── Body ── */}
                    <div className="fp-body">

                        {/* New Password */}
                        <div>
                            <label className="fp-field-label">New Password</label>
                            <div className="fp-input-wrap">
                                <span className="fp-input-icon">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                </span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className={`fp-input ${passwordsMatch ? "fp-input-match" : ""}`}
                                    placeholder="New Password"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                    onKeyDown={(e) => e.key === "Enter" && handleReset()}
                                />
                                <button className="fp-eye-btn" type="button" onClick={() => setShowPassword(v => !v)}>
                                    <EyeIcon open={showPassword} />
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="fp-field-label">Confirm Password</label>
                            <div className="fp-input-wrap">
                                <span className="fp-input-icon">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    </svg>
                                </span>
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    className={`fp-input ${passwordsMatch ? "fp-input-match" : ""} ${passwordMismatch ? "fp-input-error" : ""}`}
                                    placeholder="Confirm Password"
                                    value={confirm}
                                    onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                                    onKeyDown={(e) => e.key === "Enter" && handleReset()}
                                />
                                <button className="fp-eye-btn" type="button" onClick={() => setShowConfirm(v => !v)}>
                                    <EyeIcon open={showConfirm} />
                                </button>
                            </div>
                            {passwordsMatch && (
                                <div className="fp-match-hint" style={{ color: "#15803d" }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    Passwords match
                                </div>
                            )}
                            {passwordMismatch && (
                                <div className="fp-match-hint" style={{ color: "#b91c1c" }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                    Passwords do not match
                                </div>
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="fp-message-error">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            className="fp-btn"
                            onClick={handleReset}
                            disabled={!password || !confirm}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14a2 2 0 0 1-2 2z" />
                                <polyline points="17 21 17 13 7 13 7 21" />
                                <polyline points="7 3 7 8 15 8" />
                            </svg>
                            Update Password
                        </button>

                        <div className="fp-divider">OR</div>

                        <button className="fp-back-link" onClick={() => navigate("/login")}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12" />
                                <polyline points="12 19 5 12 12 5" />
                            </svg>
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}