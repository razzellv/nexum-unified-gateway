import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';
import { cognitoSignUp } from '@/auth/cognitoClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

interface InviteData {
  inviteId: string;
  facilityId: string;
  orgId: string;
  orgType: string;
  orgName: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

function validate(form: {
  name: string; email: string; password: string; confirm: string;
  orgName: string; orgType: string; phone: string; agreed: boolean;
}, inviteMode: boolean): string | null {
  if (!form.name.trim())    return 'Full name is required.';
  if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    return 'A valid work email is required.';
  if (form.password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(form.password)) return 'Password must include at least one uppercase letter.';
  if (!/[0-9]/.test(form.password)) return 'Password must include at least one number.';
  if (form.password !== form.confirm) return 'Passwords do not match.';
  if (!inviteMode && !form.orgName.trim()) return 'Organization name is required.';
  if (!inviteMode && !form.orgType) return 'Please select an organization type.';
  if (!form.agreed) return 'You must agree to the Terms of Service and Privacy Policy.';
  return null;
}

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Weak',        color: '#ef4444' };
  if (score <= 2) return { score, label: 'Fair',        color: '#f97316' };
  if (score <= 3) return { score, label: 'Good',        color: '#eab308' };
  if (score <= 4) return { score, label: 'Strong',      color: '#22c55e' };
  return             { score, label: 'Very Strong',  color: '#00ffe1' };
}

export default function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── URL params ───────────────────────────────────────────────────────────────
  const planName  = params.get('plan')    || '';
  const priceId   = params.get('priceId') || '';
  const isPilot   = params.get('pilot')   === 'true';
  const inviteId  = params.get('invite')  || '';
  const inviteEmail = (params.get('email') || '').toLowerCase();

  // ── Invite-mode state ────────────────────────────────────────────────────────
  const [inviteData, setInviteData]     = useState<InviteData | null>(null);
  const [inviteLoading, setInviteLoading] = useState(!!inviteId);
  const [inviteError, setInviteError]   = useState('');
  const inviteMode = !!inviteId;

  useEffect(() => {
    if (!inviteId) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/invite/lookup?inviteId=${encodeURIComponent(inviteId)}`);
        if (!res.ok) throw new Error('Invite not found or expired.');
        const data = await res.json();
        if (data.status === 'accepted') throw new Error('This invite has already been used.');
        if (data.status === 'expired')  throw new Error('This invite link has expired. Ask your admin to resend it.');
        setInviteData(data);
        setForm(prev => ({
          ...prev,
          name:    data.name    || prev.name,
          email:   data.email   || inviteEmail || prev.email,
          orgName: data.orgName || prev.orgName,
          orgType: data.orgType || prev.orgType,
        }));
      } catch (err: any) {
        setInviteError(err.message || 'Could not load invite. Please contact your administrator.');
      } finally {
        setInviteLoading(false);
      }
    })();
  }, [inviteId]);

  const [form, setForm] = useState({
    name: '', email: inviteEmail, password: '', confirm: '',
    orgName: '', orgType: '', phone: '', agreed: false,
  });
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  // ── Particle canvas ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; size: number; speed: number; glow: number }[] = [];
    const stars:     { x: number; y: number; size: number; opacity: number; fade: number }[] = [];

    for (let i = 0; i < 90; i++) particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      size: Math.random() * 1.5 + 0.8, speed: Math.random() * 0.4 + 0.2,
      glow: Math.random() * 0.6 + 0.3,
    });
    for (let s = 0; s < 50; s++) stars.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      size: Math.random() * 1.2, opacity: Math.random(), fade: 0.02 + Math.random() * 0.02,
    });

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
    const err = validate(form, inviteMode);
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      await cognitoSignUp({
        email:      form.email.trim(),
        password:   form.password,
        name:       form.name.trim(),
        orgName:    inviteData?.orgName || form.orgName.trim(),
        phone:      form.phone.trim() || undefined,
        orgType:    inviteData?.orgType || form.orgType || undefined,
        // Invite-mode attributes
        facilityId: inviteData?.facilityId,
        role:       inviteData?.role,
        department: inviteData?.department,
        orgId:      inviteData?.orgId,
        inviteId:   inviteData?.inviteId,
      });

      if (inviteData?.orgType) sessionStorage.setItem('nexum_org_type', inviteData.orgType);
      else if (form.orgType)   sessionStorage.setItem('nexum_org_type', form.orgType);

      if (!inviteMode) {
        if (planName)  localStorage.setItem('nexum_pending_plan',    planName);
        if (priceId)   localStorage.setItem('nexum_pending_price_id', priceId);
        if (isPilot)   localStorage.setItem('nexum_pending_pilot',   'true');
      }

      navigate(`/verify-email?email=${encodeURIComponent(form.email.trim())}`);
    } catch (err: any) {
      const msg = err?.message || 'Registration failed. Please try again.';
      if (msg.includes('UsernameExistsException') || msg.includes('already exists')) {
        setError('An account with this email already exists. Sign in instead.');
      } else if (msg.includes('InvalidPasswordException')) {
        setError('Password does not meet requirements. Try a stronger password.');
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
  const lockedInputStyle: React.CSSProperties = {
    ...inputStyle,
    background: 'rgba(0,255,225,0.02)',
    border: '1px solid rgba(0,255,255,0.10)',
    color: '#5ec0d8',
    cursor: 'not-allowed',
  };

  const ROLE_DISPLAY: Record<string, string> = {
    engineer: 'Engineer', operator: 'Operator', technician: 'Technician',
    custodian: 'Custodian', manager: 'Manager', supervisor: 'Supervisor',
    director: 'Director', executive: 'Executive', officer: 'Officer',
    firefighter: 'Firefighter', dispatcher: 'Dispatcher', ems_tech: 'EMS Technician',
    associate: 'Associate', clerk: 'Clerk', cook: 'Cook', cashier: 'Cashier',
  };

  return (
    <>
      <style>{`
        body { margin: 0; background: #000c11; font-family: 'Poppins', sans-serif; }
        .reg-container { position: fixed; top: 0; left: 0; width: 100%; height: 100vh; background: radial-gradient(circle at 50% 20%, #00131a 0%, #00080d 85%); color: #eafcff; overflow: auto; }
        .particles-canvas { position: fixed; top: 0; left: 0; z-index: 0; }
        .reg-wrap { position: relative; z-index: 10; display: flex; align-items: flex-start; justify-content: center; min-height: 100%; padding: 32px 16px; }
        .reg-box { background: rgba(0,20,30,0.88); border: 1px solid rgba(0,255,255,0.15); box-shadow: 0 0 40px rgba(0,255,255,0.12), inset 0 0 25px rgba(0,255,255,0.06); border-radius: 20px; padding: 36px 32px; width: 100%; max-width: 420px; backdrop-filter: blur(15px); }
        .reg-title { font-size: 24px; color: #00ffe1; text-shadow: 0 0 18px #00ffe180; margin-bottom: 4px; font-weight: 700; letter-spacing: 0.6px; }
        .reg-subtitle { color: #8ad2d8; margin-bottom: 22px; font-size: 13px; }
        .reg-label { display: block; font-size: 12px; color: #8ad2d8; margin-bottom: 5px; }
        .reg-field { margin-bottom: 14px; }
        .reg-button { width: 100%; padding: 11px; background: linear-gradient(135deg,#00bfa6,#00ffe1); border: none; border-radius: 8px; color: #000; font-weight: 600; cursor: pointer; margin-top: 6px; transition: 0.35s; letter-spacing: 0.5px; font-family: 'Poppins', sans-serif; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .reg-button:hover:not(:disabled) { box-shadow: 0 0 22px #00ffe1cc; transform: translateY(-2px); }
        .reg-button:disabled { opacity: 0.6; cursor: not-allowed; }
        .reg-error { margin: 12px 0 4px; padding: 10px 14px; border-radius: 8px; background: rgba(255,60,60,0.12); border: 1px solid rgba(255,80,80,0.4); color: #ff6b6b; font-size: 0.82rem; text-align: center; line-height: 1.5; }
        .reg-link { color: #00ffe1; text-decoration: none; font-weight: 600; }
        .reg-link:hover { text-decoration: underline; }
        .invite-banner { margin-bottom: 18px; padding: 14px 16px; border-radius: 12px; background: rgba(0,255,225,0.06); border: 1px solid rgba(0,255,225,0.28); }
        .invite-banner-title { color: #00ffe1; font-size: 14px; font-weight: 700; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
        .invite-banner-body { color: #8ad2d8; font-size: 12px; line-height: 1.6; }
        .invite-pill { display: inline-block; padding: 2px 8px; border-radius: 6px; background: rgba(0,255,225,0.12); color: #00ffe1; font-weight: 600; font-size: 11px; margin: 0 2px; }
      `}</style>

      <div className="reg-container">
        <canvas ref={canvasRef} className="particles-canvas" />
        <div className="reg-wrap">
          <div className="reg-box">
            {/* Branding */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <ShieldCheck size={22} color="#00ffe1" />
              <span style={{ color: '#00ffe1', fontWeight: 700, fontSize: 15, letterSpacing: '0.4px' }}>Nexum Suum</span>
              <span style={{ color: '#5ec0d8', fontSize: 11, marginLeft: 2 }}>Facility Intelligence™</span>
            </div>

            {/* Invite loading / error state */}
            {inviteMode && inviteLoading && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#5ec0d8' }}>
                <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: 13 }}>Loading your invitation…</p>
              </div>
            )}
            {inviteMode && !inviteLoading && inviteError && (
              <div className="reg-error" style={{ marginBottom: 16 }}>
                <strong>Invite Error:</strong> {inviteError}
                <br /><br />
                <Link to="/login" className="reg-link">Sign in to an existing account →</Link>
              </div>
            )}

            {(!inviteMode || (!inviteLoading && !inviteError)) && (
              <>
                {/* Invite banner */}
                {inviteMode && inviteData && (
                  <div className="invite-banner">
                    <div className="invite-banner-title">
                      <CheckCircle2 size={16} /> You've been invited!
                    </div>
                    <div className="invite-banner-body">
                      <strong style={{ color: '#eafcff' }}>{inviteData.orgName || 'Your organization'}</strong> has invited you to join as
                      <span className="invite-pill">{ROLE_DISPLAY[inviteData.role] || inviteData.role || 'Team Member'}</span>
                      {inviteData.department && <> in <span className="invite-pill">{inviteData.department}</span></>}.
                      Create your account below to accept.
                    </div>
                  </div>
                )}

                {/* Plan / pilot banner (non-invite) */}
                {!inviteMode && (planName || isPilot) && (
                  <div style={{ marginBottom: 18, padding: '10px 14px', borderRadius: 10, background: 'rgba(0,255,225,0.07)', border: '1px solid rgba(0,255,225,0.25)', color: '#00ffe1', fontSize: 13 }}>
                    {isPilot
                      ? 'You\'re signing up for the Pilot Program — create your account to continue.'
                      : `You're signing up for the ${planName} plan — create your account to complete checkout.`}
                  </div>
                )}

                <h1 className="reg-title">{inviteMode ? 'Accept Invitation' : 'Create Account'}</h1>
                <p className="reg-subtitle">{inviteMode ? 'Complete your profile to get started.' : 'Join Nexum Suum Facility Intelligence™'}</p>

                <form onSubmit={handleSubmit} autoComplete="off">
                  <div className="reg-field">
                    <label className="reg-label">Full Name *</label>
                    <input style={inputStyle} type="text" placeholder="Jane Smith"
                      value={form.name} onChange={e => set('name', e.target.value)} required autoFocus />
                  </div>

                  <div className="reg-field">
                    <label className="reg-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Work Email *
                      {inviteMode && <Lock size={11} color="#5ec0d8" />}
                    </label>
                    <input
                      style={inviteMode ? lockedInputStyle : inputStyle}
                      type="email" placeholder="jane@yourorg.com"
                      value={form.email}
                      onChange={e => !inviteMode && set('email', e.target.value)}
                      readOnly={inviteMode}
                      required
                    />
                    {inviteMode && (
                      <p style={{ fontSize: 11, color: '#5ec0d8', marginTop: 4 }}>
                        Email is pre-set from your invitation and cannot be changed.
                      </p>
                    )}
                  </div>

                  <div className="reg-field">
                    <label className="reg-label">Password * (min 8 chars, 1 uppercase, 1 number)</label>
                    <div style={{ position: 'relative' }}>
                      <input style={{ ...inputStyle, paddingRight: 40 }}
                        type={showPass ? 'text' : 'password'} placeholder="••••••••"
                        value={form.password} onChange={e => set('password', e.target.value)} required />
                      <button type="button" onClick={() => setShowPass(!showPass)} style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: '#5ec0d8', padding: 0,
                      }}>
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {form.password && (() => {
                      const s = passwordStrength(form.password);
                      return (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
                            {[1,2,3,4,5].map(i => (
                              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= s.score ? s.color : 'rgba(255,255,255,0.1)', transition: 'background 0.2s' }} />
                            ))}
                          </div>
                          <p style={{ fontSize: 11, color: s.color }}>{s.label}</p>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="reg-field">
                    <label className="reg-label">Confirm Password *</label>
                    <div style={{ position: 'relative' }}>
                      <input style={{ ...inputStyle, paddingRight: 40 }}
                        type={showConfirm ? 'text' : 'password'} placeholder="••••••••"
                        value={form.confirm} onChange={e => set('confirm', e.target.value)} required />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: '#5ec0d8', padding: 0,
                      }}>
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Org fields — hidden in invite mode */}
                  {!inviteMode && (
                    <>
                      <div className="reg-field">
                        <label className="reg-label">Organization Name *</label>
                        <input style={inputStyle} type="text" placeholder="Acme Facilities Inc."
                          value={form.orgName} onChange={e => set('orgName', e.target.value)} required />
                      </div>
                      <div className="reg-field">
                        <label className="reg-label">Organization Type *</label>
                        <select style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                          value={form.orgType} onChange={e => set('orgType', e.target.value)} required>
                          <option value="">Select your sector…</option>
                          <option value="facility">Facility / Industrial</option>
                          <option value="retail">Retail / Service</option>
                          <option value="government">Government / Public Safety</option>
                        </select>
                      </div>
                      <div className="reg-field">
                        <label className="reg-label">Phone (optional)</label>
                        <input style={inputStyle} type="tel" placeholder="+1 555 000 0000"
                          value={form.phone} onChange={e => set('phone', e.target.value)} />
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '14px 0' }}>
                    <input type="checkbox" id="agreed" checked={form.agreed}
                      onChange={e => set('agreed', e.target.checked)}
                      style={{ marginTop: 2, accentColor: '#00ffe1', cursor: 'pointer', width: 16, height: 16 }} />
                    <label htmlFor="agreed" style={{ fontSize: 12, color: '#8ad2d8', cursor: 'pointer', lineHeight: 1.5 }}>
                      I agree to the{' '}
                      <a href="/terms" target="_blank" rel="noreferrer" className="reg-link">Terms of Service</a>
                      {' '}and{' '}
                      <a href="/privacy" target="_blank" rel="noreferrer" className="reg-link">Privacy Policy</a>
                    </label>
                  </div>

                  {error && <div className="reg-error">{error}</div>}

                  <button type="submit" className="reg-button" disabled={loading || (inviteMode && !inviteData)}>
                    {loading
                      ? <><Loader2 size={16} className="animate-spin" /> Creating Account…</>
                      : inviteMode ? 'Accept Invitation & Sign Up' : 'Create Account'
                    }
                  </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#5ec0d8' }}>
                  Already have an account?{' '}
                  <Link to="/login" className="reg-link">Sign in →</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
