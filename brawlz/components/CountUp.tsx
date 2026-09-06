'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Counts up to `value` once scrolled into view. Eases out so it decelerates
 * into the final number instead of stopping dead.
 */
export function CountUp({
  value,
  decimals = 2,
  duration = 1400,
}: {
  value: number;
  decimals?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setN(value);
      return;
    }

    let raf = 0;
    let start = 0;
    let done = false;

    const run = () => {
      if (done) return;
      done = true;
      obs.disconnect();
      window.clearTimeout(failsafe);
      const step = (t: number) => {
        if (!start) start = t;
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setN(value * eased);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const obs = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) run();
    }, { threshold: 0.3 });
    obs.observe(el);

    // If the observer never fires - background tab, unusual browser - show the
    // real number rather than leaving a headline figure sitting at zero.
    const failsafe = window.setTimeout(() => {
      if (done) return;
      done = true;
      obs.disconnect();
      setN(value);
    }, 1600);

    return () => {
      done = true;
      obs.disconnect();
      window.clearTimeout(failsafe);
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular">
      {n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  );
}
