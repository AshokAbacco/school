import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

export default function VerifyOtp() {
    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");

    const navigate = useNavigate();
    const location = useLocation();

    const identifier =
        location.state?.identifier || localStorage.getItem("identifier");

    const handleVerify = async () => {
        if (!otp) {
            setError("Please enter OTP");
            return;
        }

        if (!identifier) {
            setError("Session expired. Please try again.");
            return;
        }

        try {
            await axios.post("http://localhost:5000/api/auth/verify-otp", {
                identifier,
                otp,
            });

            navigate("/reset-password", { state: { identifier } });
        } catch (err) {
            setError(err.response?.data?.message || "Invalid OTP");
        }
    };

    return (
        <div
            style={{
                minHeight: "80vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#eaf1f8",
            }}
        >
            <div
                style={{
                    width: "320px",
                    padding: "30px",
                    borderRadius: "16px",
                    background: "#fff",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                    textAlign: "center",
                }}
            >
                <h2 style={{ marginBottom: "15px" }}>Verify OTP</h2>

                <input
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => {
                        setOtp(e.target.value);
                        setError("");
                    }}
                    style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #ccc",
                        marginBottom: "10px",
                    }}
                />

                {error && (
                    <p style={{ color: "red", fontSize: "13px" }}>{error}</p>
                )}

                <button
                    onClick={handleVerify}
                    style={{
                        width: "100%",
                        padding: "10px",
                        background: "#3b82f6",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        marginTop: "10px",
                    }}
                >
                    Verify OTP
                </button>
            </div>
        </div>
    );
}