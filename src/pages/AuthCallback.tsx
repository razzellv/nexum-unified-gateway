import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setTokens } from "../auth/token";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("🔵 AuthCallback: Starting");
    console.log("🔵 Full URL:", window.location.href);
    
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    console.log("🔵 Authorization code:", code);

    if (!code) {
      console.log("❌ No code found, redirecting to login");
      navigate("/login");
      return;
    }

    const exchangeCodeForTokens = async () => {
      try {
        const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN;
        const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
        const redirectUri = import.meta.env.VITE_REDIRECT_URI;

        console.log("🔵 Cognito Domain:", cognitoDomain);
        console.log("🔵 Client ID:", clientId);
        console.log("🔵 Redirect URI:", redirectUri);

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
        
        setTokens(data.access_token, data.id_token, data.refresh_token);
        console.log("✅ Tokens stored in localStorage");
        
        console.log("🔵 Redirecting to /");
        navigate("/");
      } catch (error) {
        console.error("❌ Auth error:", error);
        navigate("/login");
      }
    };

    exchangeCodeForTokens();
  }, [navigate]);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <p>Signing you in...</p>
      <p style={{ fontSize: "0.8rem", color: "#666" }}>Check browser console for logs</p>
    </div>
  );
}
