import React, { useState } from "react";
import { FaPhone, FaTimes } from "react-icons/fa";

const LANGUAGES = [
    { label: "English", value: "en-in" },
    { label: "Hindi", value: "hi" },
    { label: "Kannada", value: "kn" },
    { label: "Telugu", value: "te" },
    { label: "Tamil", value: "ta" },
];

export default function VoiceCallModal({
    student,
    schoolInfo,
    onClose,
    apiUrl,
}) {
    const [language, setLanguage] = useState("en-in");
    const [customMessage, setCustomMessage] = useState("");
    const [loading, setLoading] = useState(false);

    if (!student) return null;

    const pendingAmount =
        Number(student.fees || 0) - Number(student.paidAmount || 0);

    const handleSend = async () => {
        try {
            setLoading(true);

            const auth = JSON.parse(localStorage.getItem("auth"));
            const token = auth?.token;

            const body = {
                phone: student.phone,
                studentName: student.name,
                pendingAmount,
                schoolName: schoolInfo?.name || "",
                language,
            };

            if (customMessage.trim()) {
                body.message = customMessage.trim();
            }

            // Always sends default or empty configuration to fallback to backend language defaults
            body.voice = null;

            const response = await fetch(
                `${apiUrl}/api/voice/send-fee-voice`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(body),
                }
            );

            const data = await response.json();

            if (data.success) {
                alert("✅ Voice call queued successfully");
                onClose();
            } else {
                alert(data.message || "Voice call failed");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to send voice call");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="inv-overlay"
            onClick={onClose}
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
                zIndex: 9999,
                boxSizing: "border-box"
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#ffffff",
                    borderRadius: "20px",
                    width: "100%",
                    maxWidth: "500px",
                    overflow: "hidden",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                    display: "flex",
                    flexDirection: "column",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    animation: "modalFadeIn 0.2s ease-out"
                }}
            >
                {/* Header */}
                <div
                    style={{
                        background: "linear-gradient(135deg, #0f172a, #1e293b)",
                        padding: "20px 24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        position: "relative"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div
                            style={{
                                width: "42px",
                                height: "42px",
                                borderRadius: "12px",
                                background: "rgba(255, 255, 255, 0.1)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1px solid rgba(255, 255, 255, 0.1)"
                            }}
                        >
                            <FaPhone color="#38bdf8" size={18} />
                        </div>

                        <div>
                            <div style={{ color: "#ffffff", fontWeight: 600, fontSize: "16px", letterSpacing: "-0.01em" }}>
                                Voice Call Reminder
                            </div>
                            <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>
                                Automated Fee Collection System
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "#94a3b8",
                            cursor: "pointer",
                            padding: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "color 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Info Badges */}
                <div style={{
                    padding: "20px 24px 0 24px",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: "12px"
                }}>
                    <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500, textTransform: "uppercase" }}>Student</div>
                        <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: 600, marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{student.name}</div>
                    </div>
                    <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500, textTransform: "uppercase" }}>Phone Number</div>
                        <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: 600, marginTop: "4px" }}>{student.phone}</div>
                    </div>
                    <div style={{ background: "#fef2f2", padding: "12px", borderRadius: "12px", border: "1px solid #fee2e2", gridColumn: "1 / -1" }}>
                        <div style={{ fontSize: "11px", color: "#ef4444", fontWeight: 600, textTransform: "uppercase" }}>Outstanding Balance</div>
                        <div style={{ fontSize: "20px", color: "#991b1b", fontWeight: 700, marginTop: "2px" }}>₹{pendingAmount.toLocaleString('en-IN')}</div>
                    </div>
                </div>

                {/* Form Controls */}
                <div style={{ padding: "20px 24px" }}>
                    {/* Language Dropdown */}
                    <div style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "13px", color: "#334155" }}>
                            Target Language
                        </label>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: "10px",
                                border: "1px solid #cbd5e1",
                                backgroundColor: "#fff",
                                fontSize: "14px",
                                color: "#1e293b",
                                outline: "none",
                                boxSizing: "border-box"
                            }}
                        >
                            {LANGUAGES.map((l) => (
                                <option key={l.value} value={l.value}>{l.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Custom Message Textarea */}
                    <div style={{ marginBottom: "8px" }}>
                        <label style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "13px", color: "#334155" }}>
                            Custom Telephony Message <span style={{ color: "#94a3b8", fontWeight: 400 }}>(Optional)</span>
                        </label>
                        <textarea
                            rows={4}
                            maxLength={1400}
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            placeholder="Leave blank to broadcast the system's standard dynamic fee reminder script..."
                            style={{
                                width: "100%",
                                padding: "12px",
                                borderRadius: "10px",
                                border: "1px solid #cbd5e1",
                                fontSize: "14px",
                                color: "#1e293b",
                                resize: "none",
                                outline: "none",
                                boxSizing: "border-box",
                                lineHeight: "1.5"
                            }}
                        />
                        <div style={{ textAlign: "right", fontSize: "12px", color: customMessage.length >= 1300 ? "#ef4444" : "#64748b", marginTop: "6px", fontWeight: 500 }}>
                            {customMessage.length} / 1,400 chars
                        </div>
                    </div>
                </div>

                {/* Actions Footer */}
                <div
                    style={{
                        padding: "16px 24px 24px 24px",
                        background: "#f8fafc",
                        borderTop: "1px solid #f1f5f9",
                        display: "flex",
                        gap: "12px",
                        justifyContent: "flex-end"
                    }}
                >
                    <button
                        onClick={onClose}
                        disabled={loading}
                        style={{
                            padding: "10px 20px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            background: "#ffffff",
                            color: "#475569",
                            fontSize: "14px",
                            fontWeight: 500,
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSend}
                        disabled={loading}
                        style={{
                            padding: "10px 24px",
                            background: loading ? "#93c5fd" : "#2563eb",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "10px",
                            fontSize: "14px",
                            fontWeight: 500,
                            cursor: loading ? "not-allowed" : "pointer",
                            boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
                            transition: "all 0.2s"
                        }}
                    >
                        {loading ? "Triggering Call..." : "Initiate Voice Call"}
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: scale(0.96); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}