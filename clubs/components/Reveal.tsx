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

    // Failsafe for when IntersectionObserver never fires (background tab, odd
    // embedded browser). It must only rescue elements that are actually on
    // screen: revealing the whole page on a timer means everything below the
    // fold has already animated before the visitor scrolls to it.
    const failsafe = window.setInterval(() => {
      const r = el.getBoundingClientRect();
      const onScreen = r.top < window.innerHeight * 0.92 && r.bottom > 0;
      if (onScreen) {
        setShown(true);
        obs.disconnect();
        window.clearInterval(failsafe);
      }
    }, 400);

    return () => { obs.disconnect(); window.clearInterval(failsafe); };
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
