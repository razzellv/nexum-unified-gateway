export const AUTH_CONFIG = {
  domain: import.meta.env.VITE_COGNITO_DOMAIN || "https://us-east-2mkmqarq70.auth.us-east-2.amazoncognito.com",
  clientId: import.meta.env.VITE_CLIENT_ID || import.meta.env.VITE_COGNITO_CLIENT_ID || "7vvu6kruod12nu1nkfonbfekre",
  redirectUri: import.meta.env.VITE_REDIRECT_URI || `${window.location.origin}/auth/callback`,
  scope: "openid email profile",
  responseType: "code"
};
