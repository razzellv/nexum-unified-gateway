import { Component, useEffect, type ReactNode } from "react";
import { initSyncListeners } from "./lib/sync-storage";
import { BMSPollService } from "./services/BMSPollService";
import { runHvacAutoDerive } from "./lib/hvacAutoDerive";
import { DataCorrelationEngine } from "./services/DataCorrelationEngine";
import { BaselineEngine } from "./services/BaselineEngine";
import { ObservationEngine } from "./services/ObservationEngine";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { RoleProvider } from "./contexts/RoleContext";
import { AlertTriangle, RefreshCw } from "lucide-react";
import DemoPanel from "@/components/demo/DemoPanel";

// ── Global Error Boundary ─────────────────────────────────────────────────────
interface EBState { hasError: boolean; message: string }

class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, message: '' };

  static getDerivedStateFromError(err: Error): EBState {
    return { hasError: true, message: err.message || 'An unexpected error occurred.' };
  }

  componentDidCatch(err: Error, info: { componentStack: string }) {
    // Surface to any future error-tracking integration (e.g. Sentry)
    console.error('[Nexum ErrorBoundary]', err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="p-4 rounded-full bg-destructive/10 border border-destructive/20 w-16 h-16 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
              <p className="text-sm text-muted-foreground">{this.state.message}</p>
            </div>
            <button
              onClick={() => { this.setState({ hasError: false, message: '' }); window.location.reload(); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

export default function App() {
  useEffect(() => {
    // Wire up background sync listeners (focus, online events)
    const cleanup = initSyncListeners();
    // Seed baselines from any existing facility logs so the engine has prior data
    BaselineEngine.seedFromLogs();
    // Start 3-hour BMS / CMMS / BAS auto-poll
    BMSPollService.start();
    // Run HVAC auto-derivation on startup (picks up any existing equipment data)
    try { runHvacAutoDerive(); } catch { /* silent */ }
    // Re-correlate + observe + re-derive whenever a manual log is submitted
    const onLog = (e: Event) => {
      DataCorrelationEngine.run().catch(() => {});
      const log = (e as CustomEvent).detail;
      if (log) ObservationEngine.processLog(log);
      try { runHvacAutoDerive(); } catch { /* silent */ }
    };
    window.addEventListener('facility-log-submitted', onLog);
    return () => {
      cleanup();
      BMSPollService.stop();
      window.removeEventListener('facility-log-submitted', onLog);
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RoleProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <DemoPanel />
              <Outlet />
            </TooltipProvider>
          </RoleProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
