import React from "react";
import TrackingMap from "./TrackingMap";

const TrackingPage = () => {
  return (
    // ✅ Page takes full viewport minus navbar
   <div
      className="w-full p-4 bg-gray-100 relative z-0"
      style={{ height: "calc(100vh - 80px)" }}
    >
      <div
        className="
          w-full
          h-full
          rounded-2xl
          overflow-hidden
          border
          border-gray-200
          shadow-sm
          bg-white
          relative
          z-0
        "
      >
        {/* ✅ TrackingMap must get explicit 100% height from parent */}
        <div style={{ width: "100%", height: "100%" }}>
          <TrackingMap />
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;