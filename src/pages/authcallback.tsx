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

    // TEMP: mock exchange (real Lambda comes later)
    // For pilots, we assume token already exists or is injected
    // This keeps flow stable without blocking launch

    // Replace this when Lambda is live
    setTokens("mock-access-token", "mock-id-token");

    navigate("/dashboard");
  }, [navigate]);

  return <p>Signing you in…</p>;
}
