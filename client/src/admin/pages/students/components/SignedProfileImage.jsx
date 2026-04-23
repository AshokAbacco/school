import { useEffect, useState } from "react";
import { getToken } from "../../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

function SignedProfileImage({ studentId, className }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const fetchImage = async () => {
    if (!studentId) return;

    try {
      setLoading(true);

      const res = await fetch(
        `${API_URL}/api/students/${studentId}/profile-image`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      if (!res.ok) throw new Error("Failed to fetch image");

      const data = await res.json();
      setUrl(data.url);
    } catch (err) {
      console.error("Profile image error:", err);
      setUrl(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImage();
  }, [studentId]);

  // 🔁 retry only once (avoid infinite loop)
  const handleError = () => {
    if (retryCount < 1) {
      setRetryCount((c) => c + 1);
      fetchImage();
    }
  };

  // 🔹 Loading placeholder
  if (loading) {
    return (
      <div
        className={className}
        style={{
          background: "#e5e7eb",
        }}
      />
    );
  }

  // 🔹 No image fallback (initials or icon)
  if (!url) {
    return (
      <div
        className={className}
        style={{
          background: "linear-gradient(135deg, #6A89A7, #384959)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
        }}
      >
        ?
      </div>
    );
  }

  return (
    <img
      src={url}
      alt="Profile"
      className={className}
      onError={handleError}
    />
  );
}

export default SignedProfileImage;