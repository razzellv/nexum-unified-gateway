import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="flex h-screen items-center justify-center">
      <button onClick={login} className="btn-primary">
        Sign In
      </button>
    </div>
  );
}
