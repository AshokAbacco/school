// client/src/busHead/routes/BusHeadRoutes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PageLayout from "../components/PageLayout";
import Dashboard from "../pages/Dashboard";
import VehicleTracking from "../pages/VehicleTracking";

function BusHeadRoutes() {
  return (
    <PageLayout>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="vehicle-tracking" element={<VehicleTracking />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </PageLayout>
  );
}

export default BusHeadRoutes;