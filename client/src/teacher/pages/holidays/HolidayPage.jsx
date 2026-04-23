// client/src/teacher/pages/holidays/HolidayPage.jsx
// Teacher portal — read-only view
import React from "react";
import HolidayList from "../../../components/HolidayList";

const API_URL = import.meta.env.VITE_API_URL;

export default function TeacherHolidayPage() {
  return (
    <HolidayList
      apiBase={`${API_URL}/api/holidays`}
      isAdmin={false}
    />
  );
}