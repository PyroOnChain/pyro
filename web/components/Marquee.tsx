'use client';

import { type ReactNode } from 'react';

/**
 * Seamless horizontal scroll. The children are rendered twice and the track is
 * translated by exactly half its width, so the loop point is invisible.
 * Pauses on hover so anyone trying to read it can.
 */
export function Marquee({
  children,
  speed = 34,
  className = '',
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  return (
    <div className={`marquee ${className}`.trim()} aria-hidden={false}>
      <div className="marquee-track" style={{ ['--marquee-duration' as string]: `${speed}s` }}>
        <div className="marquee-group">{children}</div>
        <div className="marquee-group" aria-hidden="true">{children}</div>
      </div>
    </div>
  );
}
