import { clearAuth } from "../auth/storage";

function LogoutButton() {
  const handleLogout = () => {
    clearAuth();
   window.location.href = "/";
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: "8px 75px",
        borderRadius: "6px",
        border: "none",
        background: "#ef4444",
        color: "white",
        cursor: "pointer",
      }}
    >
      Logout
    </button>
  );
}

export default LogoutButton;
