export default function Login() {
  const login = () => {
    window.location.href = import.meta.env.VITE_COGNITO_LOGIN_URL;
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <button onClick={login} className="btn-primary">
        Sign In
      </button>
    </div>
  );
}
