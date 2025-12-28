import { AUTH_CONFIG } from "../config/auth";

export default function Login() {
  const loginUrl =
    `${AUTH_CONFIG.domain}/login` +
    `?client_id=${AUTH_CONFIG.clientId}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(AUTH_CONFIG.scope)}` +
    `&redirect_uri=${encodeURIComponent(AUTH_CONFIG.redirectUri)}`;

  return (
    <div style={{ padding: "4rem", textAlign: "center" }}>
      <h1>Nexum Suum™ Facility Intelligence</h1>
      <p>Secure access to your operations platform</p>

      <a href={loginUrl}>
        <button style={{ padding: "12px 24px", fontSize: "16px" }}>
          Sign In
        </button>
      </a>
    </div>
  );
}
