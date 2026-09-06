'use client';

import Link from 'next/link';
import { Countdown } from '@/components/Countdown';
import { CountUp } from '@/components/CountUp';
import { useBattleAddresses, useBattleSummaries, phaseOf, tugSplit, type BattleSummary } from '@/lib/battles';
import { factoryDeployed, stockByAddress } from '@/lib/addresses';
import { fmt } from '@/lib/format';

/**
 * The headline fight.
 *
 * There is deliberately no on-chain limit of one match at a time: with a
 * permissionless factory that rule is a denial-of-service button, since blocking
 * the arena for an hour costs about the price of a coffee. So the contract lets
 * anyone start anything and this decides what gets the spotlight instead, which
 * is the part users actually experience.
 *
 * Picks the live match closest to its bell, so the headline is whichever fight is
 * most urgent rather than whichever happened to be created last. Falls back to a
 * worked example when nothing is running, so the page is never empty.
 */
export function FeaturedFight() {
  const { addresses } = useBattleAddresses();
  const { battles } = useBattleSummaries(addresses);

  const live = battles
    .filter((b) => phaseOf(b) === 'live' && b.endAt !== undefined)
    .sort((x, y) => Number(x.endAt) - Number(y.endAt))[0];

  if (!factoryDeployed() || !live) return <SampleCard />;
  return <LiveCard b={live} />;
}

function LiveCard({ b }: { b: BattleSummary }) {
  const [pa, pb] = tugSplit(b.peakA, b.peakB);
  const sym = stockByAddress(b.stock)?.symbol ?? b.stockSymbol ?? '';

  return (
    <div className="panel plate" style={{ padding: '26px 26px 24px' }}>
      <div className="between" style={{ marginBottom: 22 }}>
        <span className="chip chip-live"><span className="pulse-dot">●</span> LIVE NOW</span>
        <span className="display" style={{ fontSize: 26, color: 'var(--prize)' }}>
          <Countdown endAt={b.endAt} />
        </span>
      </div>

      <div className="versus" style={{ marginBottom: 22 }}>
        <Corner side="a" name={b.nameA} sym={b.symbolA} peak={b.peakA} />
        <div className="vs"><span>VS</span></div>
        <Corner side="b" name={b.nameB} sym={b.symbolB} peak={b.peakB} align="right" />
      </div>

      <div className="tug" style={{ marginBottom: 10 }}>
        <div className="tug-a" style={{ width: `${pa}%` }} />
        <div className="tug-b" style={{ width: `${pb}%` }} />
      </div>
      <div className="between mono" style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 22 }}>
        <span style={{ color: 'var(--a)' }}>{pa.toFixed(1)}%</span>
        <span>PEAK MARKET CAP</span>
        <span style={{ color: 'var(--b)' }}>{pb.toFixed(1)}%</span>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 18 }} className="between">
        <div>
          <div className="label" style={{ marginBottom: 6 }}>PURSE SO FAR</div>
          <div className="stat" style={{ fontSize: 25, color: 'var(--prize)' }}>
            {fmt(b.totalHarvested, 18, 4)} <span style={{ fontSize: 13, color: 'var(--muted)' }}>{sym}</span>
          </div>
        </div>
        <Link href={`/battle?a=${b.address}`} className="btn btn-prize" style={{ fontSize: 15, padding: '13px 22px' }}>
          Pick a corner
        </Link>
      </div>
    </div>
  );
}

/** Shown before the first fight exists, so the page still explains itself. */
function SampleCard() {
  return (
    <div className="panel plate" style={{ padding: '26px 26px 24px' }}>
      <div className="between" style={{ marginBottom: 22 }}>
        <span className="chip chip-prize">WHAT A FIGHT LOOKS LIKE</span>
        <span className="mono" style={{ fontSize: 13, color: 'var(--muted)' }}>41:07 LEFT</span>
      </div>

      <div className="versus" style={{ marginBottom: 22 }}>
        <Corner side="a" name="Jensen’s Jacket" sym="JACKET" peak={38400000000000000000n} />
        <div className="vs"><span>VS</span></div>
        <Corner side="b" name="Cook’s Turtleneck" sym="NECK" peak={26100000000000000000n} align="right" />
      </div>

      <div className="tug" style={{ marginBottom: 10 }}>
        <div className="tug-a" style={{ width: '59.5%' }} />
        <div className="tug-b" style={{ width: '40.5%' }} />
      </div>
      <div className="between mono" style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 22 }}>
        <span style={{ color: 'var(--a)' }}>59.5%</span>
        <span>PEAK MARKET CAP</span>
        <span style={{ color: 'var(--b)' }}>40.5%</span>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 18 }} className="between">
        <div>
          <div className="label" style={{ marginBottom: 6 }}>PURSE SO FAR</div>
          <div className="stat" style={{ fontSize: 25, color: 'var(--prize)' }}>
            <CountUp value={12.84} /> <span style={{ fontSize: 13, color: 'var(--muted)' }}>NVDA</span>
          </div>
        </div>
        <Link href="/start" className="btn btn-ghost" style={{ fontSize: 15, padding: '13px 22px' }}>
          Start the first one
        </Link>
      </div>
    </div>
  );
}

function Corner(p: { side: 'a' | 'b'; name?: string; sym?: string; peak?: bigint; align?: 'right' }) {
  const c = p.side === 'a' ? 'var(--a)' : 'var(--b)';
  return (
    <div style={{ textAlign: p.align ?? 'left' }}>
      <div className="label" style={{ color: c, marginBottom: 8 }}>{p.side === 'a' ? 'SIDE A' : 'SIDE B'}</div>
      <div className="display" style={{ fontSize: 21, lineHeight: 1.1, marginBottom: 4 }}>{p.name ?? '—'}</div>
      <div className="mono" style={{ fontSize: 13, color: c, marginBottom: 10 }}>${p.sym ?? '…'}</div>
      <div className="stat" style={{ fontSize: 19 }}>{fmt(p.peak, 18, 2)}</div>
    </div>
  );
}
