import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

export default function ResetPassword() {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");

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
                <h2 style={{ marginBottom: "15px" }}>Reset Password</h2>

                <input
                    type="password"
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                    }}
                    style={{
                        width: "100%",
                        padding: "10px",
                        marginBottom: "10px",
                        borderRadius: "8px",
                        border: "1px solid #ccc",
                    }}
                />

                <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirm}
                    onChange={(e) => {
                        setConfirm(e.target.value);
                        setError("");
                    }}
                    style={{
                        width: "100%",
                        padding: "10px",
                        marginBottom: "10px",
                        borderRadius: "8px",
                        border: "1px solid #ccc",
                    }}
                />

                {error && (
                    <p style={{ color: "red", fontSize: "13px" }}>{error}</p>
                )}

                <button
                    onClick={handleReset}
                    style={{
                        width: "100%",
                        padding: "10px",
                        background: "#3b82f6",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                    }}
                >
                    Update Password
                </button>
            </div>
        </div>
    );
}