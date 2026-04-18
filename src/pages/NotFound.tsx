import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AlertTriangle, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 px-6 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
          <p className="text-xl font-semibold text-foreground">Page Not Found</p>
          <p className="text-sm text-muted-foreground mt-2">
            The route <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">{location.pathname}</code> does not exist.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Go Back
          </Button>
          <Button onClick={() => window.location.href = '/'}>
            <Home className="w-4 h-4 mr-1.5" />
            Main Hub
          </Button>
        </div>
        <p className="text-xs text-muted-foreground/60">
          If you believe this is an error, contact your facility administrator.
        </p>
      </div>
    </div>
  );
};

export default NotFound;
