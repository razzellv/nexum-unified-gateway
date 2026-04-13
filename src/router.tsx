import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";

import Login from "./pages/login";
import Index from "./pages/Index";
import AuthCallback from "./pages/AuthCallback";
import Onboarding from "./pages/Onboarding";
import Pricing from "./pages/Pricing";
import Welcome from "./pages/Welcome";
import Equipment from "./pages/Equipment";
import ComplianceDocuments from "./pages/ComplianceDocuments";
import RetailDashboard from "./pages/RetailDashboard";
import GovernmentDashboard from "./pages/GovernmentDashboard";
import EquipmentMetrics from "./pages/EquipmentMetrics";
import EquipmentLibrary from "./pages/EquipmentLibrary";
import InventoryLibrary from "./pages/InventoryLibrary";
import EquipmentSystems from "./pages/EquipmentSystems";
import FacilityDataSource from "./pages/FacilityDataSource";
import ComplianceAnalyzer from "./pages/ComplianceAnalyzer";
import ComplianceLogger from "./pages/Compliance";
import FacilityInstructor from "./pages/FacilityInstructor";

import EquipmentIntelligence from "./pages/EquipmentIntelligence";
import Dashboard from "./pages/dashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import EnergyDashboard from "./pages/EnergyDashboard";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import OperationCenter from "./pages/OperationCenter";
import EmployeeDashboards from "./pages/EmployeeDashboards";
import TechDashboard from "./pages/TechDashboard";
import OperatorDashboard from "./pages/OperatorDashboard";
import EngineerDashboard from "./pages/EngineerDashboard";
import CustodianDashboard from "./pages/CustodianDashboard";

import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import FacilityIntelligence from "./pages/FacilityIntelligence";
import StaffPerformanceCompass from "./pages/StaffPerformanceCompass";

// 🔥 Command Hub Imports
import WorkOrders from "./pages/command-hub/WorkOrders";
import Violations from "./pages/command-hub/Violations";
import CommandDashboard from "./pages/command-hub/CommandDashboard";
import Messages from "./pages/command-hub/Messages";
import Kanban from "./pages/command-hub/Kanban";
import Emergency from "./pages/command-hub/Emergency";
import Vendors from "./pages/command-hub/Vendors";
import Calendar from "./pages/command-hub/Calendar";
import Workflows from "./pages/command-hub/Workflows";
import Settings from "./pages/command-hub/Settings";
import Workload from "./pages/command-hub/Workload";

import ProtectedRoute from "./auth/ProtectedRoute";
import Courses from "./pages/Courses";
import FIAS from "./pages/FIAS";
import PolicyGuide from "./pages/PolicyGuide";
import NexumWorkspace from "./pages/NexumWorkspace";

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
        // Public — no auth required
        path: "/pricing",
        element: <Pricing />,
      },
      {
        // Public — post-payment landing
        path: "/welcome",
        element: <Welcome />,
      },
      {
        // Onboarding outside ProtectedRoute — accessible right after payment
        path: "/onboarding",
        element: <Onboarding />,
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
            element: <EquipmentMetrics />,
          },
          {
            path: "equipment-intelligence",
            element: <EquipmentIntelligence />,
          },
          {
            path: "equipment-library",
            element: <EquipmentLibrary />,
          },
          {
            path: "inventory-library",
            element: <InventoryLibrary />,
          },
          {
            path: "equipment-systems",
            element: <EquipmentSystems />,
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
          // Operation Center — facility-wide live view
          {
            path: "employee-dashboard",
            element: <OperationCenter />,
          },
          // Role-specific dashboards
          {
            path: "dashboard/employees",
            element: <EmployeeDashboards />,
          },
          {
            path: "dashboard/tech",
            element: <TechDashboard />,
          },
          {
            path: "dashboard/operator",
            element: <OperatorDashboard />,
          },
          {
            path: "dashboard/engineer",
            element: <EngineerDashboard />,
          },
          {
            path: "dashboard/custodian",
            element: <CustodianDashboard />,
          },
          {
            path: "dashboard/executive",
            element: <ExecutiveDashboard />,
          },
          {
            path: "staff-performance",
            element: <StaffPerformanceCompass />,
          },
          {
            path: "facility-intelligence",
            element: <FacilityIntelligence />,
          },
          {
            path: "data-source",
            element: <FacilityDataSource />,
          },
          {
            path: "compliance-logger",
            element: <ComplianceLogger />,
          },
          {
            path: "retail-dashboard",
            element: <RetailDashboard />,
          },
          {
            path: "government-dashboard",
            element: <GovernmentDashboard />,
          },
          {
            path: "compliance-documents",
            element: <ComplianceDocuments />,
          },
          // Command Hub Routes
          {
            path: "command-hub",
            element: <CommandDashboard />,
          },
          {
            path: "work-orders",
            element: <WorkOrders />,
          },
          {
            path: "violations",
            element: <Violations />,
          },
          {
            path: "messages",
            element: <Messages />,
          },
          {
            path: "kanban",
            element: <Kanban />,
          },
          {
            path: "emergency",
            element: <Emergency />,
          },
          {
            path: "vendors",
            element: <Vendors />,
          },
          {
            path: "calendar",
            element: <Calendar />,
          },
          {
            path: "workflows",
            element: <Workflows />,
          },
          {
            path: "settings",
            element: <Settings />,
          },
          {
            path: "workload",
            element: <Workload />,
          },
          {
            path: "compliance-analyzer",
            element: <ComplianceAnalyzer />,
          },
          {
            path: "command-center",
            element: <ComingSoon title="Facility Command Center" />,
          },
          {
            path: "instructor",
            element: <FacilityInstructor />,
          },
          {
            path: "optimize-learn",
            element: <Courses />,
          },
          {
            path: "fias",
            element: <FIAS />,
          },
          {
            path: "policy-guide",
            element: <PolicyGuide />,
          },
          {
            path: "workspace",
            element: <NexumWorkspace />,
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
