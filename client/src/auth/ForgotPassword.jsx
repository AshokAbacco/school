// src/auth/ForgotPassword.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// ── Design tokens matching school CRM ────────────────────────
const C = {
    sky: "#88BDF2",
    deep: "#384959",
    deepDark: "#243340",
    bg: "#EDF3FA",
    mist: "#BDDDFC",
    white: "#FFFFFF",
    borderLight: "#DDE9F5",
    text: "#243340",
    textLight: "#6A89A7",
    green: "#22c55e",
};

export default function ForgotPassword() {
    const [identifier, setIdentifier] = useState("");
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const handleSendOtp = async () => {
        if (!identifier) {
            setMessage("Please enter email");
            setIsSuccess(false);
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const res = await axios.post(
                "http://localhost:5000/api/auth/forgot-password",
                { identifier }
            );

            // ✅ show success
            setMessage(res.data.message);
            setIsSuccess(true);

            // ✅ store identifier (important for next steps)
            localStorage.setItem("identifier", identifier);

            // ✅ navigate to OTP page
            setTimeout(() => {
                navigate("/verify-otp", {
                    state: { identifier },
                });
            }, 1000); // small delay for UX

        } catch (err) {
            setMessage(err.response?.data?.message || "Error sending OTP");
            setIsSuccess(false);
        } finally {
            setLoading(false);
        }
    };

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

                /* Decorative background blobs */
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

                /* Decorative dots on header */
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
                    padding: 11px 14px 11px 38px;
                    border: 1.5px solid #DDE9F5;
                    border-radius: 10px;
                    font-size: 14px;
                    font-family: 'Inter', sans-serif;
                    color: #243340;
                    background: #EDF3FA;
                    outline: none;
                    transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
                }

                .fp-input::placeholder {
                    color: #6A89A7;
                    font-size: 13px;
                }

                .fp-input:focus {
                    border-color: #88BDF2;
                    background: #fff;
                    box-shadow: 0 0 0 3px rgba(136,189,242,0.18);
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

                .fp-btn:disabled {
                    opacity: 0.65;
                    cursor: not-allowed;
                }

                .fp-message {
                    display: flex;
                    align-items: flex-start;
                    gap: 9px;
                    padding: 11px 14px;
                    border-radius: 10px;
                    font-size: 13px;
                    font-weight: 500;
                    line-height: 1.45;
                    animation: fadeIn 0.22s ease forwards;
                }

                @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }

                .fp-message-success {
                    background: rgba(34,197,94,0.1);
                    border: 1px solid rgba(34,197,94,0.28);
                    color: #15803d;
                }

                .fp-message-error {
                    background: rgba(239,68,68,0.08);
                    border: 1px solid rgba(239,68,68,0.22);
                    color: #b91c1c;
                }

                .fp-divider {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #6A89A7;
                    font-size: 11px;
                    font-weight: 600;
                }

                .fp-divider::before,
                .fp-divider::after {
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
                    text-decoration: none;
                    cursor: pointer;
                    transition: color 0.15s;
                    background: none;
                    border: none;
                    font-family: 'Inter', sans-serif;
                    width: 100%;
                }

                .fp-back-link:hover { color: #88BDF2; }

                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                .fp-spinner { animation: spin 0.85s linear infinite; }

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
                            {/* Graduation cap icon inline SVG */}
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                                <path d="M6 12v5c3 3 9 3 12 0v-5" />
                            </svg>
                        </div>
                        <div className="fp-header-title">Forgot Password?</div>
                        <div className="fp-header-sub">
                            Enter your registered email.<br />
                            We'll send you a one-time password to reset access.
                        </div>
                    </div>

                    {/* ── Body ── */}
                    <div className="fp-body">

                        {/* Input field */}
                        <div>
                            <label className="fp-field-label">Email</label>
                            <div className="fp-input-wrap">
                                <span className="fp-input-icon">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="4" width="20" height="16" rx="2" />
                                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                    </svg>
                                </span>
                                <input
                                    className="fp-input"
                                    placeholder="Enter email"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && !loading && handleSendOtp()}
                                />
                            </div>
                        </div>

                        {/* Message */}
                        {message && (
                            <div className={`fp-message ${isSuccess ? "fp-message-success" : "fp-message-error"}`}>
                                {isSuccess ? (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                        <polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                ) : (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                )}
                                <span>{message}</span>
                            </div>
                        )}

                        {/* Send OTP button */}
                        <button
                            className="fp-btn"
                            onClick={handleSendOtp}
                            disabled={loading || !identifier.trim()}
                        >
                            {loading ? (
                                <>
                                    <svg className="fp-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round">
                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                    </svg>
                                    Sending OTP…
                                </>
                            ) : (
                                <>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13" />
                                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                    Send OTP
                                </>
                            )}
                        </button>

                        {/* Divider + back link */}
                        <div className="fp-divider">OR</div>

                        <button className="fp-back-link" onClick={() => window.history.back()}>
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