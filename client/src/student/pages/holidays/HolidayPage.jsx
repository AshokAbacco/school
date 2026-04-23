
// client/src/student/pages/holidays/HolidayPage.jsx
// Student portal — read-only view
import React from "react";
import HolidayList from "../../../components/HolidayList";

const STUDENT_API_URL = import.meta.env.VITE_STUDENT_API_URL ?? import.meta.env.VITE_API_URL;

export default function StudentHolidayPage() {
  return (
    <HolidayList
      apiBase={`${STUDENT_API_URL}/holidays`}
      isAdmin={false}
    />
  );
}