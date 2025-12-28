import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import ProtectedRoute from "./auth/ProtectedRoute";

import Index from "./pages/Index";
import Courses from "./pages/Courses";
import Equipment from "./pages/Equipment";
import Compliance from "./pages/Compliance";
import Virtuous from "./pages/Virtuous";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: "/", element: <Index /> },
      { path: "/login", element: <Login /> },

      {
        element: <ProtectedRoute />,
        children: [
          { path: "/courses", element: <Courses /> },
          { path: "/equipment", element: <Equipment /> },
          { path: "/compliance", element: <Compliance /> },
          { path: "/virtuous", element: <Virtuous /> },
        ],
      },

      { path: "*", element: <NotFound /> },
    ],
  },
]);
