import { useEffect, useRef } from 'react';

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    const stars: any[] = [];

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
        g.addColorStop(0, 'rgba(0,255,230,' + this.glow + ')');
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
        ctx.fillStyle = 'rgba(0,255,255,' + this.opacity + ')';
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < 90; i++) {
      particles.push(new Particle(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 1.5 + 0.8,
        Math.random() * 0.4 + 0.2,
        Math.random() * 0.6 + 0.3
      ));
    }
    
    for (let s = 0; s < 50; s++) stars.push(new Star());

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s: any) => { s.update(); s.draw(); });
      particles.forEach((p: any) => { p.update(); p.draw(); });
      requestAnimationFrame(animate);
    }
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none'
      }}
    />
  );
}
