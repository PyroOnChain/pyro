'use client';

import { useEffect, useRef } from 'react';

/**
 * The live backdrop: two energy fields shoving at each other over a perspective
 * grid, with the seam between them drifting.
 *
 * Canvas rather than a video loop on purpose. A stock clip is megabytes, never
 * quite matches the palette, and gives away that it is stock. This is a few KB,
 * loops forever because there is no loop, uses the exact brand colours, and can
 * react to the cursor and the scroll position, which a video cannot.
 *
 * It stops when the tab is hidden, when it is scrolled out of view, and entirely
 * under prefers-reduced-motion.
 */
export function ArenaCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    // cursor pushes the seam around; starts dead centre
    let mx = 0.5;
    let mxTarget = 0.5;
    const onMove = (e: MouseEvent) => { mxTarget = e.clientX / window.innerWidth; };
    window.addEventListener('mousemove', onMove, { passive: true });

    let scroll = 0;
    const onScroll = () => { scroll = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });

    // drifting motes, each biased to one side
    const motes = Array.from({ length: 46 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 2.1,
      v: 0.00012 + Math.random() * 0.00045,
      side: Math.random() < 0.5 ? 0 : 1,
      p: Math.random() * Math.PI * 2,
    }));

    let raf = 0;
    let running = true;
    let t = 0;

    const draw = () => {
      t += reduced ? 0 : 1;
      mx += (mxTarget - mx) * 0.035;

      ctx.clearRect(0, 0, w, h);

      // ---- the two fields ------------------------------------------------
      const seam = w * (0.5 + (mx - 0.5) * 0.34);
      const breath = Math.sin(t * 0.006) * 0.06;

      const left = ctx.createRadialGradient(seam * 0.35, h * 0.34, 0, seam * 0.35, h * 0.34, w * (0.62 + breath));
      left.addColorStop(0, 'rgba(255, 79, 216, 0.30)');
      left.addColorStop(0.45, 'rgba(255, 79, 216, 0.09)');
      left.addColorStop(1, 'rgba(255, 79, 216, 0)');
      ctx.fillStyle = left;
      ctx.fillRect(0, 0, w, h);

      const right = ctx.createRadialGradient(
        seam + (w - seam) * 0.65, h * 0.34, 0, seam + (w - seam) * 0.65, h * 0.34, w * (0.62 - breath)
      );
      right.addColorStop(0, 'rgba(47, 128, 255, 0.30)');
      right.addColorStop(0.45, 'rgba(47, 128, 255, 0.09)');
      right.addColorStop(1, 'rgba(47, 128, 255, 0)');
      ctx.fillStyle = right;
      ctx.fillRect(0, 0, w, h);

      // ---- the seam where they meet --------------------------------------
      const flare = ctx.createLinearGradient(seam - 90, 0, seam + 90, 0);
      flare.addColorStop(0, 'rgba(255, 229, 0, 0)');
      flare.addColorStop(0.5, `rgba(255, 229, 0, ${0.05 + Math.abs(Math.sin(t * 0.011)) * 0.05})`);
      flare.addColorStop(1, 'rgba(255, 229, 0, 0)');
      ctx.fillStyle = flare;
      ctx.fillRect(seam - 90, 0, 180, h);

      // ---- perspective grid running toward the viewer ---------------------
      const horizon = h * 0.56;
      ctx.lineWidth = 1;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.055)';
      for (let i = -13; i <= 13; i++) {
        const x = seam + i * (w / 13);
        ctx.beginPath();
        ctx.moveTo(seam + i * 22, horizon);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // horizontals bunched at the horizon, spreading as they approach
      const speed = reduced ? 0 : (t * 0.5 + scroll * 0.35) % 100;
      for (let i = 0; i < 18; i++) {
        const k = (i * 100 + speed) / 1800;
        const y = horizon + (h - horizon) * (k * k);
        if (y > h || y < horizon) continue;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.02 + k * 0.075})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // a hairline on the horizon itself
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      ctx.lineTo(w, horizon);
      ctx.stroke();

      // ---- motes ----------------------------------------------------------
      for (const m of motes) {
        if (!reduced) {
          m.y -= m.v;
          if (m.y < -0.03) { m.y = 1.03; m.x = Math.random(); }
        }
        const px = m.side === 0 ? m.x * seam : seam + m.x * (w - seam);
        const py = m.y * h;
        const a = 0.14 + Math.abs(Math.sin(t * 0.02 + m.p)) * 0.3;
        ctx.fillStyle = m.side === 0 ? `rgba(255, 79, 216, ${a})` : `rgba(47, 128, 255, ${a})`;
        ctx.beginPath();
        ctx.arc(px, py, m.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (running && !reduced) raf = requestAnimationFrame(draw);
    };

    draw();

    // stop burning frames when nobody can see it
    const io = new IntersectionObserver(([e]) => {
      running = e.isIntersecting;
      if (running && !reduced) { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }
    });
    io.observe(cv);
    const onVis = () => {
      running = !document.hidden;
      if (running && !reduced) { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return <canvas ref={ref} className="arena-canvas" aria-hidden="true" />;
}
