'use client';

import { useEffect, useRef, useState } from 'react';
import { useTreasury, type RungState } from '@/lib/treasury';
import { TREASURY, FEE_WALLET, TOKEN, BRAND, isLive } from '@/lib/config';
import { explorerAddr } from '@/lib/chain';

/** Eases a number toward its target so a live update reads as movement, not a jump. */
function useEased(target: number, ms = 900) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  const start = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setV(target);
      return;
    }
    from.current = v;
    start.current = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start.current) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      setV(from.current + (target - from.current) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // v is deliberately not a dependency: including it restarts the tween every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ms]);

  return v;
}

const shares = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

/* ------------------------------------------------------------------ status */

export function LadderStatus() {
  const t = useTreasury();
  const pct = useEased(t.current ? t.progress : 1);
  // Both, deliberately: a treasury with no coin behind it has nothing feeding
  // it, and a bar sitting at 0% would suggest otherwise.
  const live = isLive();

  if (!live) {
    return (
      <div className="panel raised" style={{ padding: '30px 30px 28px' }}>
        <div className="row" style={{ gap: 10, marginBottom: 16 }}>
          <span className="dot" style={{ background: 'var(--accent-pale)' }} />
          <span className="label" style={{ color: 'var(--accent-pale)' }}>Not launched yet</span>
        </div>
        <div className="display h-2" style={{ marginBottom: 12 }}>The ladder starts at zero.</div>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--body)', margin: 0 }}>
          No coin, no treasury, no shares. When {BRAND.ticker} launches, the treasury address gets published
          right here and this panel starts reading it every fifteen seconds.
        </p>
      </div>
    );
  }

  const cur = t.current;

  return (
    <div className="panel raised" style={{ padding: '26px 28px 24px' }}>
      <div className="spread" style={{ marginBottom: 20, gap: 14, flexWrap: 'wrap' }}>
        <div className="row" style={{ gap: 9 }}>
          <span className="dot pulse-dot" style={{ background: 'var(--accent)', color: 'var(--accent)' }} />
          <span className="label">Live from Robinhood Chain</span>
        </div>
        <span className="label">{t.clearedCount} of {t.rungs.length} rungs cleared</span>
      </div>

      {cur ? (
        <>
          <div className="label" style={{ marginBottom: 9 }}>Working on</div>
          <div className="row" style={{ gap: 12, alignItems: 'baseline', marginBottom: 20, flexWrap: 'wrap' }}>
            <span className="display" style={{ fontSize: 'clamp(30px, 5vw, 46px)' }}>
              {cur.shares} {cur.stock.symbol}
            </span>
            <span className="mono" style={{ fontSize: 13.5, color: 'var(--muted)' }}>
              whole share{cur.shares === 1 ? '' : 's'} of {cur.stock.name}
            </span>
          </div>

          <div className="bar" style={{ marginBottom: 12 }}>
            <div className="bar-fill" style={{ width: `${Math.max(0.6, pct * 100).toFixed(2)}%` }} />
          </div>

          <div className="spread mono" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            <span>
              holding{' '}
              <span style={{ color: 'var(--paper)' }}>{shares(t.held[cur.stock.symbol] ?? 0)}</span> {cur.stock.symbol}
            </span>
            <span style={{ color: 'var(--accent)' }}>{(pct * 100).toFixed(1)}%</span>
          </div>
        </>
      ) : (
        <>
          <div className="display h-2" style={{ marginBottom: 10, color: 'var(--accent)' }}>Ladder cleared.</div>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--body)', margin: 0 }}>
            Every rung is done. New ones get added and the treasury keeps climbing.
          </p>
        </>
      )}

      {t.pendingFees !== undefined && (
        <>
          <hr className="rule" style={{ margin: '20px 0 16px' }} />
          <div className="spread" style={{ gap: 12, flexWrap: 'wrap' }}>
            <span className="label">Creator fees waiting on Pons</span>
            <span className="mono" style={{ fontSize: 14, color: 'var(--paper)' }}>
              {shares(t.pendingFees)} {t.pendingSymbol}
            </span>
          </div>
          <p style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--dim)', margin: '10px 0 0' }}>
            Credited by the Pons escrow and not yet moved into the treasury. Routing is done by hand, so this
            number sits here until it is.
          </p>
        </>
      )}

      <hr className="rule" style={{ margin: '18px 0 14px' }} />
      <a
        className="mono"
        href={explorerAddr(TREASURY)}
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: 11.5, color: 'var(--dim)', letterSpacing: '0.04em', wordBreak: 'break-all' }}
      >
        treasury {TREASURY} ↗
      </a>
    </div>
  );
}

/* ------------------------------------------------------------------- rungs */

function Rung({ r, held, progress }: { r: RungState; held: number; progress: number }) {
  const cls = r.cleared ? 'rung is-cleared' : r.current ? 'rung is-current' : 'rung';
  return (
    <div className={cls}>
      {r.current && <div className="fill" style={{ width: `${(progress * 100).toFixed(2)}%` }} />}
      <div className="step">{String(r.index + 1).padStart(2, '0')}</div>
      <div className="what">
        <span className="sym">{r.stock.symbol}</span>
        <span className="qty">
          {r.shares} share{r.shares === 1 ? '' : 's'} · {r.stock.name}
        </span>
      </div>
      <div className="state">
        {r.cleared ? 'owned' : r.current ? `${shares(held)} / ${r.shares}` : 'locked'}
      </div>
    </div>
  );
}

export function LadderRungs() {
  const t = useTreasury();
  return (
    <div className="rungs">
      {t.rungs.map((r) => (
        <Rung key={r.index} r={r} held={t.held[r.stock.symbol] ?? 0} progress={r.current ? t.progress : 0} />
      ))}
    </div>
  );
}

export { TOKEN, FEE_WALLET };
