import { useEffect } from "react";
import { setTokens } from "../auth/token";

export default function AuthCallback() {
  useEffect(() => {
    console.log("🔵 AuthCallback: Starting");
    console.log("🔵 Full URL:", window.location.href);
    
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    console.log("🔵 Authorization code:", code);

    if (!code) {
      console.log("❌ No code found, redirecting to login");
      window.location.href = "/login";
      return;
    }

    const exchangeCodeForTokens = async () => {
      try {
        const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN;
        const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
        const redirectUri = import.meta.env.VITE_REDIRECT_URI;

        console.log("🔵 Exchanging code for tokens...");

        const response = await fetch(`${cognitoDomain}/oauth2/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: clientId,
            code: code,
            redirect_uri: redirectUri,
          }),
        });

        console.log("🔵 Token exchange response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.log("❌ Token exchange failed:", errorText);
          throw new Error("Token exchange failed");
        }

        const data = await response.json();
        console.log("✅ Tokens received!");
        
        // Store tokens
        setTokens(data.access_token, data.id_token, data.refresh_token);
        console.log("✅ Tokens stored in localStorage");
        
        // IMPORTANT: Use window.location.href for full page reload
        // This ensures AuthProvider re-checks auth status with fresh localStorage
        console.log("🔵 Redirecting to / with full page reload");
        window.location.href = "/";
        
      } catch (error) {
        console.error("❌ Auth error:", error);
        window.location.href = "/login";
      }
    };

    exchangeCodeForTokens();
  }, []);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <p>Signing you in...</p>
      <p style={{ fontSize: "0.8rem", color: "#666" }}>Processing authentication...</p>
    </div>
  );
}
