import { useEffect, useState } from "react";
import { setTokens } from "../auth/token";

const ADMIN_DOMAINS = ['nexumsuum.com', 'nexumsuum-facilityintelligence.com'];

function decodeJwt(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
}

/** Determine where to send the user after auth */
function getPostAuthRoute(idToken: string | null): string {
  if (!idToken) return '/pricing';
  const decoded = decodeJwt(idToken);
  if (!decoded) return '/pricing';

  const email = (decoded.email || '').toLowerCase();
  const domain = email.split('@')[1] || '';
  const role   = decoded['custom:role'] || decoded.role || '';
  const tier   = decoded['custom:tier'] || decoded['custom:subscription'] || '';

  // Admins always go straight to the app
  if (ADMIN_DOMAINS.includes(domain) || role === 'admin') return '/';

  // No plan yet → pricing / plan selection
  if (!tier) return '/pricing';

  // Has plan but hasn't completed onboarding
  const onboardingDone = localStorage.getItem('nexum_onboarding_complete') === 'true';
  if (!onboardingDone) return '/onboarding';

  return '/';
}

export default function AuthCallback() {
  const [status, setStatus] = useState("Initializing...");
  
  console.log("🟦 AuthCallback component rendered!");
  
  useEffect(() => {
    console.log("🔵 AuthCallback: Starting useEffect");
    console.log("🔵 Full URL:", window.location.href);
    
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    console.log("🔵 Authorization code:", code);

    if (!code) {
      console.log("❌ No code found, redirecting to login");
      setStatus("No code found - redirecting...");
      setTimeout(() => window.location.href = "/login", 2000);
      return;
    }

    const exchangeCodeForTokens = async () => {
      try {
        setStatus("Exchanging authorization code...");
        const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN;
        const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
        const redirectUri = `${window.location.origin}/auth/callback`;

        console.log("🔵 Exchanging code for tokens...");
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
        setStatus(`Token exchange: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.log("❌ Token exchange failed:", errorText);
          setStatus(`Failed: ${errorText}`);
          throw new Error("Token exchange failed");
        }

        const data = await response.json();
        console.log("✅ Tokens received!");
        console.log("✅ Access token (first 20 chars):", data.access_token?.substring(0, 20));
        setStatus("Tokens received! Storing...");
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setTokens(data.access_token, data.id_token, data.refresh_token);
        console.log("✅ Tokens stored in localStorage");

        const idToken = localStorage.getItem('nexum_id_token');
        const destination = getPostAuthRoute(idToken);
        console.log("🔵 Post-auth destination:", destination);
        setStatus(`Success! Redirecting${destination === '/pricing' ? ' to plan selection' : destination === '/onboarding' ? ' to onboarding' : ' to dashboard'}...`);

        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log("🔵 Redirecting to", destination);
        window.location.href = destination;
        
      } catch (error) {
        console.error("❌ Auth error:", error);
        setStatus(`Error: ${error}`);
        setTimeout(() => window.location.href = "/login", 3000);
      }
    };

    exchangeCodeForTokens();
  }, []);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>Signing you in...</h2>
      <p style={{ fontSize: "1rem", color: "#00f2ea", marginTop: "1rem" }}>{status}</p>
      <p style={{ fontSize: "0.8rem", color: "#666", marginTop: "2rem" }}>Processing authentication...</p>
      <p style={{ fontSize: "0.7rem", color: "#999", marginTop: "1rem" }}>
        Check the console for detailed logs
      </p>
    </div>
  );
}
