'use client';

import { useEffect, useRef, useState, type ReactNode, type ElementType } from 'react';

/**
 * Reveals its children once they scroll into view, then stops observing.
 * `variant` picks the motion: a plain rise, a diagonal wipe along the logo's
 * angle, or a card that settles with slight overshoot.
 *
 * Nothing here runs if the visitor has asked for reduced motion - the CSS
 * collapses every variant to its finished state, and we mark it visible
 * immediately so content is never trapped behind an animation that won't play.
 */
export function Reveal({
  children,
  variant = 'reveal',
  delay = 0,
  as: Tag = 'div',
  className = '',
  style,
}: {
  children: ReactNode;
  variant?: 'reveal' | 'wipe' | 'rise';
  delay?: number;
  as?: ElementType;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }

    // Already on screen at load (the hero): reveal on the next frame so the
    // transition actually runs rather than being skipped.
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            obs.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
    );
    obs.observe(el);

    // If the observer never fires - a background tab, an odd embedded browser,
    // anything unexpected - show the content regardless. An animation failing
    // must never mean the page stays blank.
    const failsafe = window.setTimeout(() => { setShown(true); obs.disconnect(); }, 1600);

    return () => { obs.disconnect(); window.clearTimeout(failsafe); };
  }, []);

  return (
    <Tag
      ref={ref}
      className={`${variant} ${shown ? 'in' : ''} ${className}`.trim()}
      style={{ ...style, ['--d' as string]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
