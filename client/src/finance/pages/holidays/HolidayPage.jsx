// client/src/finance/pages/holidays/HolidayPage.jsx
// Finance portal — read-only view
import React from "react";
import HolidayList from "../../../components/HolidayList";

// Finance has its own API base (different Express app / port)
const FINANCE_API_URL = import.meta.env.VITE_FINANCE_API_URL ?? import.meta.env.VITE_API_URL;

export default function FinanceHolidayPage() {
  return (
    <HolidayList
      apiBase={`${FINANCE_API_URL}/api/holidays`}
      isAdmin={false}
    />
  );
}