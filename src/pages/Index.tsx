import { useAuth } from '../hooks/useAuth';

export default function Index() {
  const { logout } = useAuth();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🎉 SUCCESS! You're Authenticated!</h1>
      <p>If you see this, the auth flow is working perfectly.</p>
      <button onClick={logout} style={{ padding: '10px 20px', marginTop: '20px' }}>
        Logout
      </button>
    </div>
  );
}
