import React from "react";
import { RetailProvider } from "@/contexts/RetailContext";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RetailProvider>
      <RouterProvider router={router} />
    </RetailProvider>
  </React.StrictMode>
);
// Force redeploy Sun Feb  1 18:11:47 EST 2026
