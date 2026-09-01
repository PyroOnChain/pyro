'use client';

import { useEffect, useRef } from 'react';

/**
 * A ladder receding into the dark, rungs drifting upward. Canvas rather than DOM
 * because it is a continuous field, and fixed rather than scrolling so the page
 * reads as if it is climbing past it.
 */
export function Backdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = Math.floor(w * dpr);
      cv.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const RUNGS = 26;
    const SPEED = 0.018;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const horizon = h * 0.66;
      const phase = reduced ? 0 : (t * SPEED) / 1000;

      // The two rails, converging on the horizon.
      const railBottom = w * 0.78;
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      for (const dir of [-1, 1]) {
        const grad = ctx.createLinearGradient(0, h, 0, horizon);
        grad.addColorStop(0, 'rgba(255,255,255,0.05)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(cx + dir * railBottom, h);
        ctx.lineTo(cx + dir * 8, horizon);
        ctx.stroke();
      }

      for (let i = 0; i < RUNGS; i++) {
        // p runs 0 (horizon) -> 1 (foreground); the square puts more rungs far away.
        let p = ((i / RUNGS) + phase) % 1;
        const e = p * p;
        const y = horizon + (h - horizon) * e;
        const halfW = 8 + (railBottom - 8) * e;

        // Fade in at the horizon, out at the very bottom.
        const near = Math.min(1, e * 5);
        const far = 1 - Math.max(0, (e - 0.86) / 0.14);
        const a = Math.max(0, near * far);
        if (a <= 0) continue;

        // Every seventh rung glows: the ones already cleared.
        const lit = (i % 7 === 0);
        ctx.lineWidth = lit ? 1.6 : 1;
        ctx.strokeStyle = lit
          ? `rgba(0,229,114,${0.22 * a})`
          : `rgba(255,255,255,${0.045 * a})`;
        ctx.beginPath();
        ctx.moveTo(cx - halfW, y);
        ctx.lineTo(cx + halfW, y);
        ctx.stroke();
      }

      // Vignette so the type at the edges keeps its contrast.
      const g = ctx.createRadialGradient(cx, h * 0.55, 0, cx, h * 0.55, Math.max(w, h) * 0.75);
      g.addColorStop(0, 'rgba(8,9,11,0)');
      g.addColorStop(1, 'rgba(8,9,11,0.92)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
    />
  );
}
