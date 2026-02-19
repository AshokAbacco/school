import { useEffect, useState } from "react";
import { getToken } from "../../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

function SignedProfileImage({ studentId, className }) {
  const [url, setUrl] = useState(null);

  const fetchImage = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/students/${studentId}/profile-image`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      if (!res.ok) throw new Error("Failed to fetch image");

      const data = await res.json();
      setUrl(data.url);
    } catch (err) {
      console.error("Profile image error:", err);
    }
  };

  useEffect(() => {
    if (studentId) fetchImage();
  }, [studentId]);

  return (
    <img
      src={url}
      alt="Profile"
      className={className}
      onError={fetchImage} // auto refresh after 1 day expiry
    />
  );
}

export default SignedProfileImage;
