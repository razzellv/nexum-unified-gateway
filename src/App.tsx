import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { RoleProvider } from "./contexts/RoleContext";
import StaffPerformanceCompass from './pages/StaffPerformanceCompass';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RoleProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Outlet />
          </TooltipProvider>
        </RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
    <Route path="/staff-performance" element={<StaffPerformanceCompass />} />
  );
}
