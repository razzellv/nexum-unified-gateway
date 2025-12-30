import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setTokens } from "../auth/token";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      navigate("/");
      return;
    }

    // Exchange authorization code for tokens
    const exchangeCodeForTokens = async () => {
      try {
        const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN;
        const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
        const redirectUri = import.meta.env.VITE_REDIRECT_URI;

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

        if (!response.ok) {
          throw new Error("Token exchange failed");
        }

        const data = await response.json();
        
        // Store tokens
        setTokens(data.access_token, data.id_token, data.refresh_token);
        
        // Redirect to dashboard
        navigate("/dashboard");
      } catch (error) {
        console.error("Auth error:", error);
        navigate("/login");
      }
    };

    exchangeCodeForTokens();
  }, [navigate]);

  return <p>Signing you in...</p>;
}
