import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { cognitoConfirmSignUp, cognitoResendCode } from '@/auth/cognitoClient';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [params]  = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const email = params.get('email') || '';

  const [code, setCode]         = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; size: number; speed: number; glow: number }[] = [];
    const stars:     { x: number; y: number; size: number; opacity: number; fade: number }[] = [];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.8, speed: Math.random() * 0.4 + 0.2,
        glow: Math.random() * 0.6 + 0.3,
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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 6) { setError('Please enter the 6-digit code.'); return; }
    setError(''); setLoading(true);
    try {
      await cognitoConfirmSignUp(email, code.trim());
      // Redirect to login with verified flag. Preserve any pending plan/pilot context.
      navigate('/login?verified=true');
    } catch (err: any) {
      const msg = err?.message || 'Verification failed.';
      if (msg.includes('ExpiredCodeException')) {
        setError('Code has expired. Please request a new one.');
      } else if (msg.includes('CodeMismatchException') || msg.includes('Invalid')) {
        setError('Incorrect code. Double-check the email and try again.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true); setError(''); setSuccess('');
    try {
      await cognitoResendCode(email);
      setSuccess('A new code was sent. Check your inbox.');
    } catch (err: any) {
      setError(err?.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 12px',
    background: 'rgba(0,255,225,0.04)',
    border: '1px solid rgba(0,255,255,0.18)',
    borderRadius: '8px', color: '#eafcff', fontSize: '22px',
    fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
    textAlign: 'center', letterSpacing: '8px',
  };

  return (
    <>
      <style>{`
        body { margin: 0; background: #000c11; font-family: 'Poppins', sans-serif; }
        .ve-container {
          position: fixed; top: 0; left: 0; width: 100%; height: 100vh;
          background: radial-gradient(circle at 50% 20%, #00131a 0%, #00080d 85%);
          color: #eafcff; overflow: auto;
          display: flex; align-items: center; justify-content: center;
        }
        .particles-canvas { position: fixed; top: 0; left: 0; z-index: 0; }
        .ve-box {
          position: relative; z-index: 10;
          background: rgba(0,20,30,0.88);
          border: 1px solid rgba(0,255,255,0.15);
          box-shadow: 0 0 40px rgba(0,255,255,0.12), inset 0 0 25px rgba(0,255,255,0.06);
          border-radius: 20px; padding: 40px 36px;
          width: 100%; max-width: 400px; margin: 32px 16px;
          backdrop-filter: blur(15px); text-align: center;
        }
        .ve-icon {
          width: 64px; height: 64px; border-radius: 50%;
          background: rgba(0,255,225,0.1); border: 1px solid rgba(0,255,225,0.3);
          display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;
        }
        .ve-title { font-size: 22px; color: #00ffe1; text-shadow: 0 0 18px #00ffe180; font-weight: 700; margin-bottom: 8px; }
        .ve-sub { color: #8ad2d8; font-size: 13px; margin-bottom: 24px; line-height: 1.5; }
        .ve-button {
          width: 100%; padding: 11px;
          background: linear-gradient(135deg,#00bfa6,#00ffe1);
          border: none; border-radius: 8px; color: #000;
          font-weight: 600; cursor: pointer; margin-top: 12px;
          transition: 0.35s; font-family: 'Poppins', sans-serif; font-size: 14px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .ve-button:hover:not(:disabled) { box-shadow: 0 0 22px #00ffe1cc; transform: translateY(-2px); }
        .ve-button:disabled { opacity: 0.6; cursor: not-allowed; }
        .ve-error { margin: 12px 0; padding: 10px 14px; border-radius: 8px; background: rgba(255,60,60,0.12); border: 1px solid rgba(255,80,80,0.4); color: #ff6b6b; font-size: 0.82rem; }
        .ve-success { margin: 12px 0; padding: 10px 14px; border-radius: 8px; background: rgba(0,255,150,0.08); border: 1px solid rgba(0,255,150,0.3); color: #00ff96; font-size: 0.82rem; }
        .ve-link { color: #00ffe1; text-decoration: none; font-weight: 600; cursor: pointer; background: none; border: none; font-family: 'Poppins', sans-serif; font-size: 13px; }
        .ve-link:hover { text-decoration: underline; }
      `}</style>

      <div className="ve-container">
        <canvas ref={canvasRef} className="particles-canvas" />
        <div className="ve-box">
          <div className="ve-icon">
            <Mail size={28} color="#00ffe1" />
          </div>

          <h1 className="ve-title">Check Your Email</h1>
          <p className="ve-sub">
            We sent a 6-digit verification code to<br />
            <strong style={{ color: '#00ffe1' }}>{email || 'your email address'}</strong>
          </p>

          <form onSubmit={handleVerify}>
            <input
              style={inputStyle}
              type="text" inputMode="numeric" maxLength={6}
              placeholder="000000"
              value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />

            {error   && <div className="ve-error">{error}</div>}
            {success && <div className="ve-success">{success}</div>}

            <button type="submit" className="ve-button" disabled={loading}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> Verifying…</> : 'Verify Email'}
            </button>
          </form>

          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <button className="ve-link" onClick={handleResend} disabled={resending} type="button">
              {resending ? <><RefreshCw size={13} style={{ display: 'inline', marginRight: 4 }} /> Sending…</> : 'Resend code'}
            </button>
            <Link to="/register" className="ve-link" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#5ec0d8' }}>
              <ArrowLeft size={12} /> Wrong email? Go back
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
