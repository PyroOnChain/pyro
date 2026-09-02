'use client';

import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Countdown } from '@/components/Countdown';
import { FeaturedFight } from '@/components/FeaturedFight';
import { useBattleAddresses, useBattleSummaries, phaseOf, tugSplit } from '@/lib/battles';
import { factoryDeployed } from '@/lib/addresses';
import { fmt, short } from '@/lib/format';

export default function BattlesPage() {
  const { addresses, isLoading } = useBattleAddresses();
  const { battles, isLoading: loadingDetail } = useBattleSummaries(addresses);
  const loading = isLoading || loadingDetail;

  if (!factoryDeployed()) {
    return (
      <>
        <Header />
        <div className="shell" style={{ padding: '90px 36px', textAlign: 'center' }}>
          <div className="display h-2" style={{ marginBottom: 12 }}>NOT LIVE YET</div>
          <p style={{ color: 'var(--muted)' }}>The arena has not been deployed to this network.</p>
        </div>
        <Footer />
      </>
    );
  }

  const order = { live: 0, awaiting: 1, settled: 2 } as const;
  const sorted = [...battles].sort((x, y) => order[phaseOf(x)] - order[phaseOf(y)]);

  // whichever live fight is closest to its bell gets the spotlight above, so keep
  // it out of the grid rather than showing the same match twice
  const featured = sorted
    .filter((b) => phaseOf(b) === 'live' && b.endAt !== undefined)
    .sort((x, y) => Number(x.endAt) - Number(y.endAt))[0];
  const rest = sorted.filter((b) => b.address !== featured?.address);

  return (
    <>
      <Header />
      <div className="shell" style={{ padding: '40px 36px 60px' }}>
        <div className="between" style={{ alignItems: 'flex-end', marginBottom: 30, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="display h-2" style={{ margin: '0 0 8px' }}>THE FIGHTS</h1>
            <p style={{ fontSize: 15.5, color: 'var(--muted)', margin: 0, maxWidth: 620 }}>
              Every match ever started. Pick a side while the clock is running, or watch one settle.
            </p>
          </div>
          <Link href="/start" className="btn btn-gold" style={{ fontSize: 15, padding: '13px 22px' }}>Start a fight</Link>
        </div>

        {/* one fight gets the spotlight; the rest sit underneath */}
        {featured && (
          <div style={{ marginBottom: 34 }}>
            <div className="label" style={{ marginBottom: 12 }}>THE MAIN EVENT</div>
            <FeaturedFight />
          </div>
        )}

        {loading && <div className="panel plate" style={{ padding: 28, color: 'var(--muted)' }}>Reading the chain…</div>}

        {!loading && battles.length === 0 && (
          <div className="panel plate" style={{ padding: '52px 28px', textAlign: 'center' }}>
            <div className="display" style={{ fontSize: 26, marginBottom: 10 }}>NO FIGHTS YET</div>
            <p style={{ color: 'var(--muted)', margin: '0 0 22px' }}>Someone has to throw the first punch.</p>
            <Link href="/start" className="btn btn-gold">Start the first one</Link>
          </div>
        )}

        <div className="card-grid">
          {rest.map((b) => {
            const ph = phaseOf(b);
            const [pa, pb] = tugSplit(b.peakA, b.peakB);
            const winA = b.winner === 1;
            const winB = b.winner === 2;
            return (
              <Link key={b.address} href={`/battle?a=${b.address}`} className="panel plate lift" style={{ padding: '22px 22px 20px', display: 'block' }}>
                <div className="between" style={{ marginBottom: 18 }}>
                  {ph === 'live' && <span className="chip chip-live"><span className="pulse-dot">●</span> LIVE</span>}
                  {ph === 'awaiting' && <span className="chip chip-gold">AWAITING BELL</span>}
                  {ph === 'settled' && (
                    <span className={`chip ${winA ? 'chip-red' : winB ? 'chip-blue' : ''}`}>
                      {winA ? 'SIDE A WON' : winB ? 'SIDE B WON' : 'DRAW'}
                    </span>
                  )}
                  <span className="mono" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                    {ph === 'live' ? <Countdown endAt={b.endAt} /> : short(b.address)}
                  </span>
                </div>

                <div className="versus" style={{ marginBottom: 16, gap: 14 }}>
                  <div>
                    <div className="label" style={{ color: 'var(--red)', marginBottom: 6 }}>SIDE A</div>
                    <div className="display" style={{ fontSize: 18, lineHeight: 1.15 }}>{b.nameA ?? '—'}</div>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--red)' }}>${b.symbolA ?? '…'}</div>
                  </div>
                  <div className="vs" style={{ width: 46, height: 46, fontSize: 17 }}><span>VS</span></div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="label" style={{ color: 'var(--blue)', marginBottom: 6 }}>SIDE B</div>
                    <div className="display" style={{ fontSize: 18, lineHeight: 1.15 }}>{b.nameB ?? '—'}</div>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--blue)' }}>${b.symbolB ?? '…'}</div>
                  </div>
                </div>

                <div className="tug" style={{ marginBottom: 8 }}>
                  <div className="tug-a" style={{ width: `${pa}%` }} />
                  <div className="tug-b" style={{ width: `${pb}%` }} />
                </div>
                <div className="between mono" style={{ fontSize: 11.5, color: 'var(--dim)' }}>
                  <span style={{ color: 'var(--red)' }}>{fmt(b.peakA, 18, 2)}</span>
                  <span>PEAK</span>
                  <span style={{ color: 'var(--blue)' }}>{fmt(b.peakB, 18, 2)}</span>
                </div>

                {b.totalHarvested !== undefined && b.totalHarvested > 0n && (
                  <div style={{ borderTop: '1px solid var(--line)', marginTop: 16, paddingTop: 14 }} className="between">
                    <span className="label">PURSE PAID</span>
                    <span className="stat" style={{ color: 'var(--gold)', fontSize: 15 }}>{fmt(b.totalHarvested, 18, 4)}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
      <Footer />
    </>
  );
}
