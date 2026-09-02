'use client';

import type { ReactNode } from 'react';

/**
 * Two identical tracks side by side, the first sliding a full width left. The
 * duplicate is what makes the loop seamless, so it is not decorative.
 */
export function Marquee({ children, speed = 30 }: { children: ReactNode; speed?: number }) {
  return (
    <div className="marquee">
      <div className="marquee-track" style={{ ['--dur' as string]: `${speed}s` }}>{children}</div>
      <div className="marquee-track" style={{ ['--dur' as string]: `${speed}s` }} aria-hidden="true">{children}</div>
    </div>
  );
}
