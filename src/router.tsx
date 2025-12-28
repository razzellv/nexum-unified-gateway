import { createBrowserRouter } from "react-router-dom";
import Login from "./pages/login";
import Index from "./pages/Index";
import AuthCallback from "./pages/AuthCallback";
import ProtectedRoute from "./auth/protectedroute";

export const router = createBrowserRouter([
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
    ],
  },
]);
