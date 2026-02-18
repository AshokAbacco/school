// client/src/admin/pages/teachers/components/TeacherCardSkeleton.jsx
import React from "react";

export default function TeacherCardSkeleton() {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4 animate-pulse"
      style={{ border: "1.5px solid #BDDDFC", background: "#fff" }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-12 h-12 rounded-full"
          style={{ background: "#e8f4fd" }}
        />
        <div
          className="w-16 h-5 rounded-full"
          style={{ background: "#e8f4fd" }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <div
          className="h-4 w-3/4 rounded-md"
          style={{ background: "#e8f4fd" }}
        />
        <div
          className="h-3 w-1/2 rounded-md"
          style={{ background: "#e8f4fd" }}
        />
        <div
          className="h-3 w-2/5 rounded-md"
          style={{ background: "#e8f4fd" }}
        />
      </div>
      <div
        className="flex gap-2 pt-2"
        style={{ borderTop: "1px solid #BDDDFC" }}
      >
        <div
          className="flex-1 h-8 rounded-lg"
          style={{ background: "#e8f4fd" }}
        />
        <div
          className="flex-1 h-8 rounded-lg"
          style={{ background: "#e8f4fd" }}
        />
        <div
          className="flex-1 h-8 rounded-lg"
          style={{ background: "#e8f4fd" }}
        />
      </div>
    </div>
  );
}
