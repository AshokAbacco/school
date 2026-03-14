import { Routes, Route, Navigate } from "react-router-dom";
import FinanceDashboard from "./FinanceDashboard";
import Studentfinance from "./pages/Studentfinance/Studentfinance";
import Teachersfinance from "./pages/Teachersfinance/Teachersfinance";
import GroupASalary from "./pages/Teachersfinance/GroupASalary";

import PageLayout from "./components/PageLayout";

const FinanceAppRoutes = () => {
  return (
    <Routes>
      <Route path="pagelayout" element={<PageLayout />} />
      <Route path="/" element={<FinanceDashboard />} />
      <Route path="/studentfinance" element={<Studentfinance />} />
      <Route path="/teachersfinance" element={<Teachersfinance />} />

      <Route path="/group-a" element={<GroupASalary />} />


      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default FinanceAppRoutes;