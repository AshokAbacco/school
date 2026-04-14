// client/src/finance/Routes.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import PageLayout from "./components/PageLayout";
 
import FinanceDashboard from "./FinanceDashboard";
import Studentfinance from "./pages/Studentfinance/Studentfinance";
import Teachersfinance from "./pages/Teachersfinance/Teachersfinance";
import GroupASalary from "./pages/Teachersfinance/GroupASalary";
import GroupBSalary from "./pages/Teachersfinance/GroupBSalary";
import GroupCSalary from "./pages/Teachersfinance/GroupCSalary";
import GroupDSalary from "./pages/Teachersfinance/GroupDSalary";
import Expense from "./pages/Expense/Expense";
import FinanceChat from "./pages/chat/FinanceChat";
 
const FinanceRoutes = () => {
  return (
<PageLayout>
  <Routes>
    <Route index                  element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard"       element={<FinanceDashboard />} />
    <Route path="studentfinance"  element={<Studentfinance />} />
    <Route path="teachersfinance" element={<Teachersfinance />} />
    <Route path="group-a"         element={<GroupASalary />} />
    <Route path="group-b"         element={<GroupBSalary />} />
    <Route path="group-c"         element={<GroupCSalary />} />
    <Route path="group-d"         element={<GroupDSalary />} />
    <Route path="/expenses"         element={<Expense />} />
    <Route path="/chat"         element={<FinanceChat />} />
    
    <Route path="*"               element={<Navigate to="dashboard" replace />} />
  </Routes>
</PageLayout>
  );
};
 
export default FinanceRoutes;