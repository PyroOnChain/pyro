'use client';

import Link from 'next/link';
import { Header } from '@/components/Header';
import { NotDeployed } from '@/components/NotDeployed';
import { useClubAddresses, useClubSummaries, factoryDeployed } from '@/lib/clubs';
import { stockByAddress } from '@/lib/addresses';
import { fmt, fmtCompact, short } from '@/lib/format';
import { explorerAddr } from '@/lib/chain';

export default function ClubsPage() {
  const { addresses, isLoading } = useClubAddresses();
  const { clubs, isLoading: loadingDetail } = useClubSummaries(addresses);

  if (!factoryDeployed()) {
    return (<><Header /><NotDeployed /></>);
  }

  const totalStock = clubs.reduce((a, c) => a + (c.totalAssets ?? 0n), 0n);

  return (
    <>
      <Header />
      <div className="shell" style={{ padding: '34px 40px 60px' }}>
        <div className="between" style={{ alignItems: 'flex-end', marginBottom: 26, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="display h-2" style={{ letterSpacing: '0.01em', margin: '0 0 8px' }}>CLUBS</h1>
            <p style={{ fontSize: 15, color: 'var(--muted)', margin: 0 }}>
              Every club holds one stock and runs one mascot. Anyone can open another.
            </p>
          </div>
          <Link href="/create" className="btn btn-primary" style={{ display: 'inline-block', padding: '14px 24px', fontSize: 14 }}>
            OPEN A CLUB
          </Link>
        </div>

        <div className="grid-4" style={{ marginBottom: 28 }}>
          <Stat label="STOCK IN ALL JARS" value={fmtCompact(totalStock)} />
          <Stat label="OPEN CLUBS" value={String(clubs.length)} />
          <Stat label="PROTOCOL FEE" value="0%" />
          <Stat label="CHAIN" value="4663" />
        </div>

        <div className="slab card table-scroll">
          <table>
            <thead>
              <tr>
                <th>CLUB</th><th>MASCOT</th><th>IN THE JAR</th>
                <th>CREATOR CUT</th><th>UNDRIPPED</th><th />
              </tr>
            </thead>
            <tbody>
              {(isLoading || loadingDetail) && (
                <tr><td colSpan={6} style={{ color: 'var(--muted)' }}>Reading the chain…</td></tr>
              )}
              {!isLoading && !loadingDetail && clubs.length === 0 && (
                <tr><td colSpan={6} style={{ color: 'var(--muted)' }}>
                  No clubs yet. Someone has to go first.
                </td></tr>
              )}
              {clubs.map((c) => {
                const sym = c.assetSymbol ?? stockByAddress(c.asset)?.symbol ?? '??';
                return (
                  <tr key={c.address}>
                    <td>
                      <div className="row" style={{ gap: 13 }}>
                        <div className="chip" style={{ width: 34, height: 34, background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span className="display" style={{ fontSize: 11, color: 'var(--bg)' }}>{sym.slice(0, 2)}</span>
                        </div>
                        <div>
                          <div className="display" style={{ fontSize: 15, letterSpacing: '0.04em' }}>{c.name ?? short(c.address)}</div>
                          <div className="mono" style={{ fontSize: 11.5, color: 'var(--dim)' }}>{short(c.address)}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {c.mascot && c.mascot !== '0x0000000000000000000000000000000000000000' ? (
                        <a href={explorerAddr(c.mascot)} target="_blank" rel="noreferrer noopener"
                           title={c.mascot} style={{ color: 'var(--ember-ink)' }}>
                          <span className="display" style={{ fontSize: 15, letterSpacing: '0.03em' }}>
                            ${c.mascotSymbol ?? '…'}
                          </span>
                        </a>
                      ) : (
                        <span className="mono" style={{ color: 'var(--dim)' }}>none yet</span>
                      )}
                    </td>
                    <td className="mono" style={{ fontWeight: 700 }}>{fmtCompact(c.totalAssets)} {sym}</td>
                    <td className="mono">{c.creatorFeeBps !== undefined ? `${(c.creatorFeeBps / 100).toFixed(1)}%` : '—'}</td>
                    <td className="mono" style={{ color: 'var(--gain)' }}>{fmt(c.lockedProfit, 18, 2)}</td>
                    <td>
                      <Link href={`/clubs/${c.address}`} className="chip"
                        style={{ display: 'block', border: '1px solid var(--stroke)', padding: '8px 0', textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="row" style={{ gap: 10, marginTop: 22, padding: '16px 20px', background: 'var(--band)', border: '1px solid var(--line)' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
          </svg>
          <span style={{ fontSize: 13, color: 'var(--body)' }}>
            Undripped is harvested fees still releasing into the jar over 24 hours. A club with a dead mascot still holds
            its stock, so a flat column is not a broken club.
          </span>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="slab card" style={{ padding: '20px 22px' }}>
      <div className="label" style={{ marginBottom: 9 }}>{label}</div>
      <div className="stat" style={{ fontSize: 27 }}>{value}</div>
    </div>
  );
}
