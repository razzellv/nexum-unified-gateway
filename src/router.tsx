import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";

import Login from "./pages/login";
import Index from "./pages/Index";

import ProtectedRoute from "./auth/ProtectedRoute";

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/",
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <Index />,
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
