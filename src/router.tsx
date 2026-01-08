import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";

import Login from "./pages/login";
import Index from "./pages/Index";
import AuthCallback from "./pages/AuthCallback";
import Equipment from "./pages/Equipment";
import EquipmentIntelligence from "./pages/EquipmentIntelligence";
import Dashboard from "./pages/dashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import EnergyDashboard from "./pages/EnergyDashboard";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import FacilityIntelligence from "./pages/FacilityIntelligence";






import ProtectedRoute from "./auth/ProtectedRoute";

// Placeholder component for modules in progress
const ComingSoon = ({ title }: { title: string }) => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center p-8">
      <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
      <p className="text-muted-foreground">Integration in progress</p>
    </div>
  </div>
);

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/auth/callback",
        element: <AuthCallback />,
      },
      {
        path: "/",
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <Index />,
          },
          {
            path: "equipment",
            element: <Equipment />,
          },
          {
            path: "equipment-intelligence",
            element: <EquipmentIntelligence />,
          },
          {
            path: "dashboard",
            element: <Dashboard />,
          },
          {
            path: "dashboard/manager",
            element: <ManagerDashboard />,
          },
          {
            path: "dashboard/energy",
            element: <EnergyDashboard />,
          },
          {
            path: "dashboard/supervisor",
            element: <SupervisorDashboard />,
          },
          {
            path: "dashboard/employee",
            element: <EmployeeDashboard />,
          },
          {
            path: "dashboard/executive",
            element: <ExecutiveDashboard />,
          },
          {
            path: "facility-intelligence",
            element: <FacilityIntelligence />,
          },
          {
            path: "data-source",
            element: <ComingSoon title="Facility Data Source" />,
          },
          {
            path: "command-center",
            element: <ComingSoon title="Facility Command Center" />,
          },
          {
            path: "instructor",
            element: <ComingSoon title="Facility Instructor" />,
          },
          {
            path: "compliance-analyzer",
            element: <ComingSoon title="Compliance Analyzer" />,
          },
          {
            path: "compliance-log",
            element: <ComingSoon title="Compliance Log" />,
          },
          {
            path: "optimize-learn",
            element: <ComingSoon title="Optimize & Learn" />,
          },
        ],
      },
      {
        path: "*",
        element: <Navigate to="/login" replace />,
      },
    ],
  },
]);
