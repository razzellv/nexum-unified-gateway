import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";

import Login from "./pages/login";
import Index from "./pages/Index";
import AuthCallback from "./pages/AuthCallback";
import Equipment from "./pages/Equipment";
import EquipmentMetrics from "./pages/EquipmentMetrics";
import EquipmentLibrary from "./pages/EquipmentLibrary";
import FacilityDataSource from "./pages/FacilityDataSource";
import Compliance from "./pages/Compliance";

import EquipmentIntelligence from "./pages/EquipmentIntelligence";
import Dashboard from "./pages/dashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import EnergyDashboard from "./pages/EnergyDashboard";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import FacilityIntelligence from "./pages/FacilityIntelligence";

// 🔥 NEW: Command Hub Imports
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
            element: <FacilityDataSource />,
          },
          {
            path: "compliance-logger",
            element: <Compliance />,
          },
          // 🔥 NEW: Command Hub Routes
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
          },          {

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


          // 🔥 UPDATED: Replace placeholder with Violations page
          {
            path: "compliance-analyzer",
            element: <Violations />, // Using Violations page for Compliance Analyzer
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
