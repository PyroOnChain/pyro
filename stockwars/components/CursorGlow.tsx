'use client';

import { useEffect, useRef } from 'react';

/**
 * A soft follower that trails the real cursor and swells over anything
 * interactive. Deliberately additive: the native cursor is never hidden, so
 * nothing about clicking or reading changes if this fails to load.
 *
 * Skipped entirely on touch devices and under reduced-motion.
 */
export function CursorGlow() {
  const dot = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia?.('(hover: none)').matches) return;

    const el = dot.current;
    if (!el) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    let raf = 0;
    let visible = false;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!visible) {
        visible = true;
        el.style.opacity = '1';
      }
      const over = (e.target as HTMLElement)?.closest?.(
        'a, button, [role="button"], input, .lift'
      );
      el.classList.toggle('over', Boolean(over));
    };

    const onLeave = () => { visible = false; el.style.opacity = '0'; };

    // Trail rather than track exactly - the lag is what makes it feel alive.
    const loop = () => {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={dot} className="cursor-glow" aria-hidden="true" />;
}
