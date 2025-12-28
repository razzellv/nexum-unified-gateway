import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import AuthCallback from "./pages/AuthCallback";
import ProtectedRoute from "./auth/protectedroute";

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: "/", element: <Navigate to="/login" replace /> },
      { path: "/login", element: <Login /> },
      { path: "/auth/callback", element: <AuthCallback /> },
      {
        path: "/dashboard",
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
