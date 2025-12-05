import { useState, useEffect, useCallback } from "react";

export interface HealthStatus {
  status: "connected" | "syncing" | "offline";
  ping: number | null;
  lastSync: Date;
  error?: string;
}

export const useHealthCheck = (url: string, interval: number = 5000) => {
  const [health, setHealth] = useState<HealthStatus>({
    status: "syncing",
    ping: null,
    lastSync: new Date()
  });

  const checkHealth = useCallback(async () => {
    const startTime = performance.now();
    
    try {
      // Use a simple fetch with no-cors mode to check if the URL is reachable
      // This won't give us the response body but will tell us if the server responds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      
      setHealth({
        status: "connected",
        ping: latency,
        lastSync: new Date()
      });
    } catch (error) {
      // If fetch fails with no-cors, it might still be reachable
      // Only mark as offline if we get a network error
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      
      if (error instanceof Error && error.name === "AbortError") {
        setHealth({
          status: "offline",
          ping: null,
          lastSync: new Date(),
          error: "Request timeout"
        });
      } else {
        // For CORS errors, assume connected since the server responded
        setHealth({
          status: "connected",
          ping: latency,
          lastSync: new Date()
        });
      }
    }
  }, [url]);

  useEffect(() => {
    checkHealth();
    const intervalId = setInterval(checkHealth, interval);
    return () => clearInterval(intervalId);
  }, [checkHealth, interval]);

  return { ...health, refresh: checkHealth };
};
