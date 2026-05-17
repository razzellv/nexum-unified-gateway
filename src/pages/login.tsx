import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  cognitoSignIn,
  cognitoForgotPassword,
  cognitoConfirmPassword,
} from '@/auth/cognitoClient';

const ADMIN_DOMAINS = ['nexumsuum.com', 'nexumsuum-facilityintelligence.com'];

type LoginView = 'login' | 'forgot' | 'reset';

export default function Login() {
  const { login, authError } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isVerified = params.get('verified') === 'true';
  const isPilot    = params.get('pilot')    === 'true';

  const [view, setView]             = useState<LoginView>('login');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(isVerified ? 'Email verified! Sign in below.' : '');
  const [loading, setLoading]       = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail]   = useState('');
  const [resetCode, setResetCode]       = useState('');
  const [newPass, setNewPass]           = useState('');
  const [confirmPass, setConfirmPass]   = useState('');
  const [showNewPass, setShowNewPass]   = useState(false);

  // ── Particle canvas ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; size: number; speed: number; glow: number }[] = [];
    const stars:     { x: number; y: number; size: number; opacity: number; fade: number }[] = [];

    for (let i = 0; i < 90; i++) {
      const size = Math.random() * 1.5 + 0.8;
      particles.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        size, speed: Math.random() * 0.4 + 0.2, glow: Math.random() * 0.6 + 0.3,
      });
    }
    for (let s = 0; s < 50; s++) {
      stars.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        size: Math.random() * 1.2, opacity: Math.random(), fade: 0.02 + Math.random() * 0.02,
      });
    }

    let raf: number;
    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        s.opacity += s.fade;
        if (s.opacity >= 1 || s.opacity <= 0) s.fade *= -1;
        ctx.beginPath();
        ctx.fillStyle = `rgba(0,255,255,${s.opacity})`;
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });
      particles.forEach(p => {
        p.y -= p.speed;
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        g.addColorStop(0, `rgba(0,255,230,${p.glow})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      raf = requestAnimationFrame(animate);
    }
    animate();

    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  // ── Direct email/password sign-in via Cognito SDK ────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await cognitoSignIn(email.trim(), password);
      // Admin domains always go straight to the app
      const emailDomain = email.trim().split('@')[1]?.toLowerCase() || '';
      const isAdminEmail = ADMIN_DOMAINS.includes(emailDomain);
      if (isAdminEmail) {
        navigate('/');
        return;
      }

      // Check for pending plan checkout
      const pendingPlan    = sessionStorage.getItem('nexum_pending_plan');
      const pendingPilot   = sessionStorage.getItem('nexum_pending_pilot');
      const facilityId     = localStorage.getItem('nexum_active_facility_id') ||
                             localStorage.getItem('nexum_facility_id');

      if (pendingPilot) {
        sessionStorage.removeItem('nexum_pending_pilot');
        navigate('/onboarding?pilot=true');
      } else if (pendingPlan) {
        sessionStorage.removeItem('nexum_pending_plan');
        sessionStorage.removeItem('nexum_pending_price_id');
        navigate('/pricing');
      } else if (!facilityId) {
        navigate('/onboarding');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      const msg = err?.message || 'Sign in failed.';
      if (msg.includes('NotAuthorizedException') || msg.includes('Incorrect username or password')) {
        setError('Incorrect email or password.');
      } else if (msg.includes('UserNotConfirmedException')) {
        setError('Please verify your email first.');
        navigate(`/verify-email?email=${encodeURIComponent(email.trim())}`);
      } else if (msg.includes('UserNotFoundException')) {
        setError('No account found with this email.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password ──────────────────────────────────────────────────────────
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await cognitoForgotPassword(forgotEmail.trim());
      setSuccess('Reset code sent — check your inbox.');
      setView('reset');
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPass !== confirmPass) { setError('Passwords do not match.'); return; }
    if (newPass.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await cognitoConfirmPassword(forgotEmail.trim(), resetCode.trim(), newPass);
      setSuccess('Password updated! Sign in below.');
      setView('login');
      setPassword('');
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    background: 'rgba(0,255,225,0.04)',
    border: '1px solid rgba(0,255,255,0.18)',
    borderRadius: '8px', color: '#eafcff', fontSize: '14px',
    fontFamily: "'Poppins', sans-serif", outline: 'none', boxSizing: 'border-box',
  };

  return (
    <>
      <style>{`
        body { margin: 0; background: #000c11; font-family: 'Poppins', sans-serif; }
        .login-container {
          position: fixed; top: 0; left: 0; width: 100%; height: 100vh;
          background: radial-gradient(circle at 50% 20%, #00131a 0%, #00080d 85%);
          color: #eafcff; overflow: hidden;
        }
        .particles-canvas { position: fixed; top: 0; left: 0; z-index: 0; }
        .intro-screen {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: linear-gradient(180deg, #000c11 0%, #001c25 100%);
          display: flex; align-items: center; justify-content: center;
          flex-direction: column; color: #00ffe1; z-index: 1000;
          animation: fadeOut 0.8s ease 1s forwards;
        }
        .intro-text {
          font-size: 20px; text-shadow: 0 0 12px #00ffe1cc;
          white-space: nowrap; overflow: hidden;
          border-right: 2px solid #00ffe1; width: 0;
          animation: typing 2s steps(30,end), blink 0.8s step-end infinite alternate;
        }
        @keyframes typing { from { width: 0; } to { width: 260px; } }
        @keyframes blink { 50% { border-color: transparent; } }
        @keyframes fadeOut { to { opacity: 0; visibility: hidden; } }
        .auth-wrap {
          position: relative; z-index: 10;
          display: flex; align-items: center; justify-content: center;
          height: 100%; flex-direction: column;
          opacity: 0; animation: fadeInConsole 0.8s ease 1.5s forwards;
        }
        @keyframes fadeInConsole { to { opacity: 1; } }
        .auth-box {
          background: rgba(0,20,30,0.85);
          border: 1px solid rgba(0,255,255,0.15);
          box-shadow: 0 0 40px rgba(0,255,255,0.15), inset 0 0 25px rgba(0,255,255,0.08);
          border-radius: 20px; padding: 36px 30px; width: 370px;
          text-align: center; backdrop-filter: blur(15px);
          transform-style: preserve-3d; transition: transform 0.8s ease, box-shadow 0.6s ease;
          max-height: 90vh; overflow-y: auto;
        }
        .auth-box:hover { transform: rotateY(3deg); box-shadow: 0 0 60px rgba(0,255,255,0.3); }
        .auth-title {
          font-size: 26px; color: #00ffe1; text-shadow: 0 0 18px #00ffe180;
          margin-bottom: 4px; letter-spacing: 0.8px; font-weight: 700;
        }
        .auth-subtitle { color: #8ad2d8; margin-bottom: 20px; font-size: 13px; }
        .auth-button {
          width: 100%; padding: 11px;
          background: linear-gradient(135deg,#00bfa6,#00ffe1);
          border: none; border-radius: 8px; color: #000;
          font-weight: 600; cursor: pointer; margin-top: 10px;
          transition: 0.35s; letter-spacing: 0.5px;
          font-family: 'Poppins', sans-serif; font-size: 14px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .auth-button:hover:not(:disabled) { box-shadow: 0 0 22px #00ffe1cc; transform: translateY(-2px); }
        .auth-button:disabled { opacity: 0.6; cursor: not-allowed; }
        .sso-button {
          width: 100%; padding: 10px;
          background: transparent; border: 1px solid rgba(0,255,255,0.25);
          border-radius: 8px; color: #8ad2d8;
          font-weight: 500; cursor: pointer; margin-top: 8px;
          transition: 0.3s; font-family: 'Poppins', sans-serif; font-size: 13px;
        }
        .sso-button:hover { border-color: rgba(0,255,255,0.5); color: #00ffe1; }
        .auth-error {
          margin: 10px 0; padding: 10px 14px; border-radius: 8px;
          background: rgba(255,60,60,0.12); border: 1px solid rgba(255,80,80,0.4);
          color: #ff6b6b; font-size: 0.82rem; text-align: center; line-height: 1.5;
        }
        .auth-success {
          margin: 10px 0; padding: 10px 14px; border-radius: 8px;
          background: rgba(0,255,150,0.08); border: 1px solid rgba(0,255,150,0.3);
          color: #00ff96; font-size: 0.82rem; text-align: center;
        }
        .pilot-banner {
          margin-bottom: 16px; padding: 10px 14px; border-radius: 10px;
          background: rgba(0,255,225,0.07); border: 1px solid rgba(0,255,225,0.25);
          color: #00ffe1; font-size: 12px; text-align: left;
        }
        .auth-link { color: #00ffe1; text-decoration: none; font-weight: 600; }
        .auth-link:hover { text-decoration: underline; }
        .auth-divider {
          display: flex; align-items: center; gap: 10; margin: 16px 0;
        }
        .auth-divider::before, .auth-divider::after {
          content: ''; flex: 1; height: 1px; background: rgba(0,255,255,0.12);
        }
        .login-footer {
          position: absolute; bottom: 10px; text-align: center;
          width: 100%; color: #5ec0d8; font-size: 0.8rem; opacity: 0.7;
        }
        .field-row { text-align: left; margin-bottom: 12px; }
        .field-label { display: block; font-size: 11px; color: #8ad2d8; margin-bottom: 4px; }
      `}</style>

      <div className="login-container">
        <canvas ref={canvasRef} className="particles-canvas" />

        <div className="intro-screen">
          <div className="intro-text">Accessing Nexum Core Systems…</div>
        </div>

        <div className="auth-wrap">
          <div className="auth-box">

            {/* ── LOGIN VIEW ─────────────────────────────────────────────── */}
            {view === 'login' && (
              <>
                <h1 className="auth-title">ACCESS CONSOLE</h1>
                <p className="auth-subtitle">Sign in to Nexum Suum Systems</p>

                {isPilot && (
                  <div className="pilot-banner">
                    Complete your account setup to start your pilot program access.
                  </div>
                )}

                {(authError || error) && <div className="auth-error">{authError || error}</div>}
                {success               && <div className="auth-success">{success}</div>}

                {/* Direct email / password form */}
                <form onSubmit={handleSignIn} style={{ textAlign: 'left' }}>
                  <div className="field-row">
                    <label className="field-label">Email</label>
                    <input
                      style={inputStyle} type="email" placeholder="you@yourorg.com"
                      value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                    />
                  </div>
                  <div className="field-row">
                    <label className="field-label">Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        style={{ ...inputStyle, paddingRight: 40 }}
                        type={showPass ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password} onChange={e => setPassword(e.target.value)} required
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)} style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: '#5ec0d8', padding: 0,
                      }}>
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <div style={{ textAlign: 'right', marginTop: 4 }}>
                      <button type="button" className="auth-link"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
                        onClick={() => { setView('forgot'); setError(''); setSuccess(''); }}>
                        Forgot password?
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="auth-button" disabled={loading}>
                    {loading ? <><Loader2 size={15} className="animate-spin" /> Signing in…</> : 'Sign In'}
                  </button>
                </form>

                {/* SSO divider */}
                <div className="auth-divider">
                  <span style={{ fontSize: 11, color: '#5ec0d8', whiteSpace: 'nowrap' }}>or</span>
                </div>

                <button onClick={login} className="sso-button">
                  Sign in with SSO / Cognito Hosted UI
                </button>

                <p style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: '#5ec0d8' }}>
                  No account?{' '}
                  <Link to="/register" className="auth-link">Create one →</Link>
                </p>
              </>
            )}

            {/* ── FORGOT PASSWORD VIEW ────────────────────────────────────── */}
            {view === 'forgot' && (
              <>
                <button type="button" onClick={() => { setView('login'); setError(''); setSuccess(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5ec0d8', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, marginBottom: 16 }}>
                  <ArrowLeft size={13} /> Back to sign in
                </button>

                <h1 className="auth-title" style={{ fontSize: 22 }}>Reset Password</h1>
                <p className="auth-subtitle">Enter your email to receive a reset code.</p>

                {error   && <div className="auth-error">{error}</div>}
                {success && <div className="auth-success">{success}</div>}

                <form onSubmit={handleForgotSubmit} style={{ textAlign: 'left' }}>
                  <div className="field-row">
                    <label className="field-label">Email</label>
                    <input
                      style={inputStyle} type="email" placeholder="you@yourorg.com"
                      value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required autoFocus
                    />
                  </div>
                  <button type="submit" className="auth-button" disabled={loading}>
                    {loading
                      ? <><Loader2 size={15} className="animate-spin" /> Sending…</>
                      : <><RefreshCw size={15} /> Send Reset Code</>}
                  </button>
                </form>
              </>
            )}

            {/* ── RESET PASSWORD VIEW ─────────────────────────────────────── */}
            {view === 'reset' && (
              <>
                <button type="button" onClick={() => { setView('forgot'); setError(''); setSuccess(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5ec0d8', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, marginBottom: 16 }}>
                  <ArrowLeft size={13} /> Back
                </button>

                <h1 className="auth-title" style={{ fontSize: 22 }}>Enter New Password</h1>
                <p className="auth-subtitle">Check your email for the reset code.</p>

                {error   && <div className="auth-error">{error}</div>}
                {success && <div className="auth-success">{success}</div>}

                <form onSubmit={handleResetSubmit} style={{ textAlign: 'left' }}>
                  <div className="field-row">
                    <label className="field-label">Reset Code</label>
                    <input
                      style={{ ...inputStyle, letterSpacing: 4, textAlign: 'center' }}
                      type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                      value={resetCode} onChange={e => setResetCode(e.target.value.replace(/\D/g, ''))} required autoFocus
                    />
                  </div>
                  <div className="field-row">
                    <label className="field-label">New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        style={{ ...inputStyle, paddingRight: 40 }}
                        type={showNewPass ? 'text' : 'password'} placeholder="••••••••"
                        value={newPass} onChange={e => setNewPass(e.target.value)} required
                      />
                      <button type="button" onClick={() => setShowNewPass(!showNewPass)} style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: '#5ec0d8', padding: 0,
                      }}>
                        {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div className="field-row">
                    <label className="field-label">Confirm New Password</label>
                    <input
                      style={inputStyle}
                      type="password" placeholder="••••••••"
                      value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required
                    />
                  </div>
                  <button type="submit" className="auth-button" disabled={loading}>
                    {loading ? <><Loader2 size={15} className="animate-spin" /> Updating…</> : 'Update Password'}
                  </button>
                </form>
              </>
            )}

          </div>
        </div>

        <footer className="login-footer">
          © 2025 Nexum Suum Inc | Secure Facility Access Interface
        </footer>
      </div>
    </>
  );
}
