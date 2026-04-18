import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { cognitoSignUp } from '@/auth/cognitoClient';

function validate(form: {
  name: string; email: string; password: string; confirm: string;
  orgName: string; phone: string; agreed: boolean;
}): string | null {
  if (!form.name.trim())    return 'Full name is required.';
  if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    return 'A valid work email is required.';
  if (form.password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(form.password)) return 'Password must include at least one uppercase letter.';
  if (!/[0-9]/.test(form.password)) return 'Password must include at least one number.';
  if (form.password !== form.confirm) return 'Passwords do not match.';
  if (!form.orgName.trim()) return 'Organization name is required.';
  if (!form.agreed) return 'You must agree to the Terms of Service and Privacy Policy.';
  return null;
}

export default function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const planName  = params.get('plan')    || '';
  const priceId   = params.get('priceId') || '';
  const isPilot   = params.get('pilot')   === 'true';

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '', orgName: '', phone: '', agreed: false,
  });
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  // ── Particle canvas (matches login page) ─────────────────────────────────────
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

  const set = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const err = validate(form);
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      await cognitoSignUp({
        email:    form.email.trim(),
        password: form.password,
        name:     form.name.trim(),
        orgName:  form.orgName.trim(),
        phone:    form.phone.trim() || undefined,
      });
      // Preserve plan / pilot context for after verification
      if (planName)  sessionStorage.setItem('nexum_pending_plan',    planName);
      if (priceId)   sessionStorage.setItem('nexum_pending_price_id', priceId);
      if (isPilot)   sessionStorage.setItem('nexum_pending_pilot',   'true');

      navigate(`/verify-email?email=${encodeURIComponent(form.email.trim())}`);
    } catch (err: any) {
      const msg = err?.message || 'Registration failed. Please try again.';
      if (msg.includes('UsernameExistsException') || msg.includes('already exists')) {
        setError('An account with this email already exists. Sign in instead.');
      } else if (msg.includes('InvalidPasswordException')) {
        setError('Password does not meet Cognito requirements. Try a stronger password.');
      } else {
        setError(msg);
      }
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
        .reg-container {
          position: fixed; top: 0; left: 0; width: 100%; height: 100vh;
          background: radial-gradient(circle at 50% 20%, #00131a 0%, #00080d 85%);
          color: #eafcff; overflow: auto;
        }
        .particles-canvas { position: fixed; top: 0; left: 0; z-index: 0; }
        .reg-wrap {
          position: relative; z-index: 10; display: flex;
          align-items: flex-start; justify-content: center;
          min-height: 100%; padding: 32px 16px;
        }
        .reg-box {
          background: rgba(0,20,30,0.88);
          border: 1px solid rgba(0,255,255,0.15);
          box-shadow: 0 0 40px rgba(0,255,255,0.12), inset 0 0 25px rgba(0,255,255,0.06);
          border-radius: 20px; padding: 36px 32px;
          width: 100%; max-width: 420px;
          backdrop-filter: blur(15px);
        }
        .reg-title {
          font-size: 24px; color: #00ffe1;
          text-shadow: 0 0 18px #00ffe180;
          margin-bottom: 4px; font-weight: 700; letter-spacing: 0.6px;
        }
        .reg-subtitle { color: #8ad2d8; margin-bottom: 22px; font-size: 13px; }
        .reg-label { display: block; font-size: 12px; color: #8ad2d8; margin-bottom: 5px; }
        .reg-field { margin-bottom: 14px; }
        .reg-button {
          width: 100%; padding: 11px;
          background: linear-gradient(135deg,#00bfa6,#00ffe1);
          border: none; border-radius: 8px; color: #000;
          font-weight: 600; cursor: pointer; margin-top: 6px;
          transition: 0.35s; letter-spacing: 0.5px;
          font-family: 'Poppins', sans-serif; font-size: 14px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .reg-button:hover:not(:disabled) { box-shadow: 0 0 22px #00ffe1cc; transform: translateY(-2px); }
        .reg-button:disabled { opacity: 0.6; cursor: not-allowed; }
        .reg-error {
          margin: 12px 0 4px; padding: 10px 14px; border-radius: 8px;
          background: rgba(255,60,60,0.12); border: 1px solid rgba(255,80,80,0.4);
          color: #ff6b6b; font-size: 0.82rem; text-align: center; line-height: 1.5;
        }
        .reg-link { color: #00ffe1; text-decoration: none; font-weight: 600; }
        .reg-link:hover { text-decoration: underline; }
        .plan-banner {
          margin-bottom: 18px; padding: 10px 14px; border-radius: 10px;
          background: rgba(0,255,225,0.07); border: 1px solid rgba(0,255,225,0.25);
          color: #00ffe1; font-size: 13px;
        }
      `}</style>

      <div className="reg-container">
        <canvas ref={canvasRef} className="particles-canvas" />
        <div className="reg-wrap">
          <div className="reg-box">
            {/* Branding */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <ShieldCheck size={22} color="#00ffe1" />
              <span style={{ color: '#00ffe1', fontWeight: 700, fontSize: 15, letterSpacing: '0.4px' }}>
                Nexum Suum
              </span>
              <span style={{ color: '#5ec0d8', fontSize: 11, marginLeft: 2 }}>Facility Intelligence™</span>
            </div>

            {/* Plan / pilot banner */}
            {(planName || isPilot) && (
              <div className="plan-banner">
                {isPilot
                  ? 'You\'re signing up for the Pilot Program — create your account to continue.'
                  : `You're signing up for the ${planName} plan — create your account to complete checkout.`}
              </div>
            )}

            <h1 className="reg-title">Create Account</h1>
            <p className="reg-subtitle">Join Nexum Suum Facility Intelligence™</p>

            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="reg-field">
                <label className="reg-label">Full Name *</label>
                <input
                  style={inputStyle}
                  type="text" placeholder="Jane Smith"
                  value={form.name} onChange={e => set('name', e.target.value)}
                  required autoFocus
                />
              </div>

              <div className="reg-field">
                <label className="reg-label">Work Email *</label>
                <input
                  style={inputStyle}
                  type="email" placeholder="jane@yourorg.com"
                  value={form.email} onChange={e => set('email', e.target.value)}
                  required
                />
              </div>

              <div className="reg-field">
                <label className="reg-label">Password * (min 8 chars, 1 uppercase, 1 number)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    style={{ ...inputStyle, paddingRight: 40 }}
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password} onChange={e => set('password', e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#5ec0d8', padding: 0,
                  }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="reg-field">
                <label className="reg-label">Confirm Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    style={{ ...inputStyle, paddingRight: 40 }}
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.confirm} onChange={e => set('confirm', e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#5ec0d8', padding: 0,
                  }}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="reg-field">
                <label className="reg-label">Organization Name *</label>
                <input
                  style={inputStyle}
                  type="text" placeholder="Acme Facilities Inc."
                  value={form.orgName} onChange={e => set('orgName', e.target.value)}
                  required
                />
              </div>

              <div className="reg-field">
                <label className="reg-label">Phone (optional)</label>
                <input
                  style={inputStyle}
                  type="tel" placeholder="+1 555 000 0000"
                  value={form.phone} onChange={e => set('phone', e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '14px 0' }}>
                <input
                  type="checkbox" id="agreed" checked={form.agreed}
                  onChange={e => set('agreed', e.target.checked)}
                  style={{ marginTop: 2, accentColor: '#00ffe1', cursor: 'pointer', width: 16, height: 16 }}
                />
                <label htmlFor="agreed" style={{ fontSize: 12, color: '#8ad2d8', cursor: 'pointer', lineHeight: 1.5 }}>
                  I agree to the{' '}
                  <a href="/terms" target="_blank" rel="noreferrer" className="reg-link">Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy" target="_blank" rel="noreferrer" className="reg-link">Privacy Policy</a>
                </label>
              </div>

              {error && <div className="reg-error">{error}</div>}

              <button type="submit" className="reg-button" disabled={loading}>
                {loading ? <><Loader2 size={16} className="animate-spin" /> Creating Account…</> : 'Create Account'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#5ec0d8' }}>
              Already have an account?{' '}
              <Link to="/login" className="reg-link">Sign in →</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
