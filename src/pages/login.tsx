import { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { login, authError } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Particle animation
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = [];
    const stars: Star[] = [];

    class Particle {
      x: number; y: number; size: number; speed: number; glow: number;
      
      constructor(x: number, y: number, size: number, speed: number, glow: number) {
        this.x = x; this.y = y; this.size = size; this.speed = speed; this.glow = glow;
      }
      
      update() {
        this.y -= this.speed;
        if (this.y < -10) {
          this.y = canvas!.height + 10;
          this.x = Math.random() * canvas!.width;
        }
      }
      
      draw() {
        if (!ctx) return;
        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3);
        g.addColorStop(0, `rgba(0,255,230,${this.glow})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    class Star {
      x: number; y: number; size: number; opacity: number; fadeSpeed: number;
      
      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.size = Math.random() * 1.2;
        this.opacity = Math.random();
        this.fadeSpeed = 0.02 + Math.random() * 0.02;
      }
      
      update() {
        this.opacity += this.fadeSpeed;
        if (this.opacity >= 1 || this.opacity <= 0) this.fadeSpeed *= -1;
      }
      
      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.fillStyle = `rgba(0,255,255,${this.opacity})`;
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Initialize particles
    for (let i = 0; i < 90; i++) {
      const size = Math.random() * 1.5 + 0.8;
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const speed = Math.random() * 0.4 + 0.2;
      const glow = Math.random() * 0.6 + 0.3;
      particles.push(new Particle(x, y, size, speed, glow));
    }
    
    for (let s = 0; s < 50; s++) stars.push(new Star());

    // Animation loop
    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => { s.update(); s.draw(); });
      particles.forEach(p => { p.update(); p.draw(); });
      requestAnimationFrame(animate);
    }
    animate();

    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <style>{`
        body { margin: 0; background: #000c11; font-family: 'Poppins', sans-serif; }
        
        .login-container {
          position: fixed;
          top: 0; left: 0;
          width: 100%; height: 100vh;
          background: radial-gradient(circle at 50% 20%, #00131a 0%, #00080d 85%);
          color: #eafcff;
          overflow: hidden;
        }
        
        .particles-canvas {
          position: fixed;
          top: 0; left: 0;
          z-index: 0;
        }
        
        .intro-screen {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: linear-gradient(180deg, #000c11 0%, #001c25 100%);
          display: flex; align-items: center; justify-content: center;
          flex-direction: column;
          color: #00ffe1;
          z-index: 1000;
          animation: fadeOut 0.8s ease 1s forwards;
        }
        
        .intro-text {
          font-size: 20px;
          text-shadow: 0 0 12px #00ffe1cc;
          white-space: nowrap;
          overflow: hidden;
          border-right: 2px solid #00ffe1;
          width: 0;
          animation: typing 2s steps(30,end), blink 0.8s step-end infinite alternate;
        }
        
        @keyframes typing { from { width: 0; } to { width: 260px; } }
        @keyframes blink { 50% { border-color: transparent; } }
        @keyframes fadeOut { to { opacity: 0; visibility: hidden; } }
        
        .auth-wrap {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          flex-direction: column;
          perspective: 1000px;
          opacity: 0;
          animation: fadeInConsole 0.8s ease 1.5s forwards;
        }
        
        @keyframes fadeInConsole { to { opacity: 1; } }
        
        .auth-box {
          background: rgba(0,20,30,0.85);
          border: 1px solid rgba(0,255,255,0.15);
          box-shadow: 0 0 40px rgba(0,255,255,0.15), inset 0 0 25px rgba(0,255,255,0.08);
          border-radius: 20px;
          padding: 40px 30px;
          width: 370px;
          text-align: center;
          backdrop-filter: blur(15px);
          transform-style: preserve-3d;
          transition: transform 0.8s ease, box-shadow 0.6s ease;
        }
        
        .auth-box:hover {
          transform: rotateY(5deg);
          box-shadow: 0 0 60px rgba(0,255,255,0.3);
        }
        
        .auth-title {
          font-size: 28px;
          color: #00ffe1;
          text-shadow: 0 0 18px #00ffe180;
          margin-bottom: 6px;
          letter-spacing: 0.8px;
          font-weight: 700;
        }
        
        .auth-subtitle {
          color: #8ad2d8;
          margin-bottom: 24px;
          font-size: 14px;
        }
        
        .auth-button {
          width: 100%;
          padding: 11px;
          background: linear-gradient(135deg,#00bfa6,#00ffe1);
          border: none;
          border-radius: 8px;
          color: #000;
          font-weight: 600;
          cursor: pointer;
          margin-top: 12px;
          transition: 0.35s;
          letter-spacing: 0.5px;
          font-family: 'Poppins', sans-serif;
        }
        
        .auth-button:hover {
          box-shadow: 0 0 22px #00ffe1cc;
          transform: translateY(-2px);
        }
        
        .login-footer {
          position: absolute;
          bottom: 10px;
          text-align: center;
          width: 100%;
          color: #5ec0d8;
          font-size: 0.8rem;
          opacity: 0.7;
        }
      `}</style>

      <div className="login-container">
        <canvas ref={canvasRef} className="particles-canvas" />
        
        <div className="intro-screen">
          <div className="intro-text">Accessing Nexum Core Systems…</div>
        </div>

        <div className="auth-wrap">
          <div className="auth-box">
            <h1 className="auth-title">ACCESS CONSOLE</h1>
            <p className="auth-subtitle">Sign in to Nexum Suum Systems</p>

            {authError && (
              <div style={{
                margin: '12px 0',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(255,60,60,0.12)',
                border: '1px solid rgba(255,80,80,0.4)',
                color: '#ff6b6b',
                fontSize: '0.82rem',
                textAlign: 'center',
                lineHeight: 1.5,
              }}>
                {authError}
              </div>
            )}

            <button onClick={login} className="auth-button">
              Enter System
            </button>
          </div>
        </div>

        <footer className="login-footer">
          © 2025 Nexum Suum Inc | Secure Facility Access Interface
        </footer>
      </div>
    </>
  );
}
