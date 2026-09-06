'use client';

import Link from 'next/link';
import { Header } from '@/components/Header';
import { NotDeployed } from '@/components/NotDeployed';
import { useClubAddresses, useClubSummaries, factoryDeployed } from '@/lib/clubs';
import { stockByAddress } from '@/lib/addresses';
import { fmt, fmtCompact, short } from '@/lib/format';
import { useClubMetas, ponsTokenUrl } from '@/lib/clubMeta';

const ZERO = '0x0000000000000000000000000000000000000000';

export default function ClubsPage() {
  const { addresses, isLoading } = useClubAddresses();
  const { clubs, isLoading: loadingDetail } = useClubSummaries(addresses);
  const metas = useClubMetas(clubs.map((c) => ({ address: c.address, creator: c.creator })));

  if (!factoryDeployed()) {
    return (<><Header /><NotDeployed /></>);
  }

  const totalStock = clubs.reduce((a, c) => a + (c.totalAssets ?? 0n), 0n);
  const loading = isLoading || loadingDetail;

  return (
    <>
      <Header />
      <div className="shell" style={{ padding: '34px 40px 64px' }}>
        <div className="between" style={{ alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="display h-2" style={{ letterSpacing: '0.01em', margin: '0 0 8px' }}>CLUBS</h1>
            <p style={{ fontSize: 15, color: 'var(--muted)', margin: 0, maxWidth: 620, textWrap: 'pretty' }}>
              Every club holds one stock and runs one mascot. Join a club by putting that stock in
              its vault, and every trade of the mascot sends fees back to the vault as more stock.
              Anyone can open another.
            </p>
          </div>
          <Link href="/create" className="btn btn-primary" style={{ display: 'inline-block', padding: '14px 24px', fontSize: 15 }}>
            OPEN A CLUB
          </Link>
        </div>

        {/* the totals, as one inventory bar rather than four floating cards */}
        <div className="hotbar" style={{ marginBottom: 30 }}>
          <Slot label="STOCK IN ALL VAULTS" value={fmtCompact(totalStock)} />
          <Slot label="OPEN CLUBS" value={String(clubs.length)} />
          <Slot label="PROTOCOL FEE" value="0%" />
          <Slot label="CHAIN" value="4663" />
        </div>

        {loading && (
          <div className="card" style={{ padding: '30px 26px', color: 'var(--muted)' }}>Reading the chain…</div>
        )}

        {!loading && clubs.length === 0 && (
          <div className="card" style={{ padding: '46px 26px', textAlign: 'center' }}>
            <div className="display" style={{ fontSize: 22, marginBottom: 8 }}>NO CLUBS YET</div>
            <p style={{ fontSize: 15, color: 'var(--muted)', margin: '0 0 22px' }}>Someone has to go first.</p>
            <Link href="/create" className="btn btn-primary" style={{ display: 'inline-block', padding: '14px 26px', fontSize: 15 }}>
              OPEN THE FIRST ONE
            </Link>
          </div>
        )}

        {/* A club is a place, not a row in a spreadsheet, so each one gets a card
            with its mascot on it. This also survives a phone, which the six-column
            table never really did. */}
        <div className="card-grid">
          {clubs.map((c) => {
            const sym = c.assetSymbol ?? stockByAddress(c.asset)?.symbol ?? '??';
            const logo = metas[c.address.toLowerCase()]?.logo;
            const hasMascot = c.mascot && c.mascot !== ZERO;
            return (
              <div key={c.address} className="card lift club-card">
                <div className="club-card-head">
                  <div
                    className="club-avatar"
                    style={{ background: logo ? `center / cover no-repeat url("${logo}")` : 'var(--ink)' }}
                  >
                    {!logo && (
                      <span className="display" style={{ fontSize: 17, color: 'var(--bg)' }}>{sym.slice(0, 2)}</span>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="display" style={{ fontSize: 18, letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.mascotName?.trim() || c.name || short(c.address)}
                    </div>
                    <div className="mono" style={{ fontSize: 11.5, color: 'var(--dim)' }}>
                      {sym} club · {short(c.address)}
                    </div>
                  </div>
                </div>

                <div style={{ padding: '20px 22px 4px' }}>
                  <div className="label" style={{ marginBottom: 7 }}>IN THE VAULT</div>
                  <div className="stat" style={{ fontSize: 33 }}>
                    {fmtCompact(c.totalAssets)} <span style={{ fontSize: 15, color: 'var(--muted)' }}>{sym}</span>
                  </div>
                </div>

                <div className="club-card-rows">
                  <Row k="Mascot" v={
                    hasMascot ? (
                      <a href={ponsTokenUrl(c.mascot!)} target="_blank" rel="noreferrer noopener"
                         className="display" style={{ fontSize: 15, color: 'var(--accent-ink)' }}>
                        ${c.mascotSymbol ?? '…'}
                      </a>
                    ) : <span className="mono" style={{ color: 'var(--dim)' }}>none yet</span>
                  } />
                  <Row k="Creator cut" v={
                    <span className="mono">{c.creatorFeeBps !== undefined ? `${(c.creatorFeeBps / 100).toFixed(1)}%` : '—'}</span>
                  } />
                  <Row k="Undripped" v={
                    <span className="mono" style={{ color: 'var(--gain)' }}>{fmt(c.lockedProfit, 18, 2)}</span>
                  } />
                </div>

                <div style={{ padding: '0 22px 22px' }}>
                  <Link href={`/club?a=${c.address}`} className="btn btn-ghost"
                    style={{ display: 'block', textAlign: 'center', padding: '13px 0', fontSize: 15 }}>
                    OPEN THE CLUB
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="row" style={{ gap: 10, marginTop: 26, padding: '16px 20px', background: 'var(--band)', border: '3px solid var(--ink)' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
          </svg>
          <span style={{ fontSize: 13, color: 'var(--body)' }}>
            Undripped is harvested fees still releasing into the vault over 24 hours. A club with a dead mascot still holds
            its stock, so a flat number is not a broken club.
          </span>
        </div>
      </div>
    </>
  );
}

function Slot({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 7 }}>{label}</div>
      <div className="stat" style={{ fontSize: 24 }}>{value}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="between" style={{ padding: '9px 0' }}>
      <span style={{ fontSize: 13.5, color: 'var(--muted)' }}>{k}</span>
      {v}
    </div>
  );
}
