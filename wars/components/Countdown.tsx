'use client';

import { useEffect, useState } from 'react';

/** Ticks locally between chain reads so the clock never looks frozen. */
export function Countdown({ endAt, className, style }: { endAt?: bigint; className?: string; style?: React.CSSProperties }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  if (endAt === undefined) return <span className={className} style={style}>—</span>;
  const left = Number(endAt) - now;
  if (left <= 0) return <span className={className} style={style}>TIME</span>;

  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <span className={className} style={style}>
      {h > 0 ? `${pad(h)}:` : ''}{pad(m)}:{pad(s)}
    </span>
  );
}
