import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Dashboard from "./dashboard/Dashboard";
import StudentsList from "./pages/students/StudentsList";
import Schools from "./pages/schools/Schools";
import SchoolAdmins from "./pages/SchoolAdmins/SchoolAdmins";
import UsersManagement from "./pages/UsersManagement/UsersManagement";
import RolesPermissions from "./pages/roles/RolesPermissions";
import Plans from "./pages/Subscription/Plans"
import Analytics from "./pages/Analytics/Analytics";
import Mettings from "./pages/mettings/Mettings";
import Fees from "./pages/Fees/Fees";
import AddFee from "./pages/Fees/AddFee";
function App() {
  return (
      <Routes>
        {/* Dashboard Route */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/students" element={<StudentsList />} />
        <Route path="/schools" element={<Schools />} />
        <Route path="/schools-admins" element={<SchoolAdmins />} />
        <Route path="/users-management" element={<UsersManagement/>}/>
        <Route path="/roles-permissions" element={<RolesPermissions/>}/>
        <Route path="/subscription-Plans" element={<Plans/>}/>
        <Route path="/analytics" element={<Analytics/>}/>
        <Route path="/mettings" element={<Mettings/>}/>
        <Route path="/fees" element={<Fees/>}/>
        <Route path="/fees-add" element={<AddFee/>}/>

      {/* Students Routes */}

        {/* Students Routes */}
       
        {/* Redirect any unknown route to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
  );
}

export default App;
