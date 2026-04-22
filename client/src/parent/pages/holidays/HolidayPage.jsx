// client/src/parent/pages/holidays/HolidayPage.jsx
// Parent portal — read-only view
import React from "react";
import HolidayList from "../../../components/HolidayList";

const PARENT_API_URL = import.meta.env.VITE_PARENT_API_URL ?? import.meta.env.VITE_API_URL;

export default function ParentHolidayPage() {
  return (
    <HolidayList
      apiBase={`${PARENT_API_URL}/holidays`}
      isAdmin={false}
    />
  );
}