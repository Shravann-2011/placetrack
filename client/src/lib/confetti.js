// A small, dependency-free confetti burst on a temporary <canvas>.
// Skipped entirely when the user prefers reduced motion.
const COLORS = ['#4f46e5', '#8b5cf6', '#10b981', '#f59e0b', '#0ea5e9', '#f43f5e'];

export function celebrate() {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 70 });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);

  // Two cannons, bottom-left and bottom-right, firing up and inwards
  const pieces = Array.from({ length: 140 }, (_, i) => {
    const left = i % 2 === 0;
    const angle = (left ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.7;
    const speed = 9 + Math.random() * 9;
    return {
      x: left ? 0 : innerWidth, y: innerHeight * 0.85,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 5, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      color: COLORS[i % COLORS.length], shape: i % 3,
    };
  });

  const start = performance.now();
  (function frame(now) {
    const t = now - start;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of pieces) {
      p.vy += 0.28;        // gravity
      p.vx *= 0.99;        // air resistance
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t / 2600);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.size / 4, -p.size / 2, p.size / 2, p.size);
      ctx.restore();
    }
    if (t < 2800) requestAnimationFrame(frame);
    else canvas.remove();
  })(start);
}
