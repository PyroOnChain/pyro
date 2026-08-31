'use client';

import Link from 'next/link';
import { use } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress } from 'viem';
import { useState } from 'react';
import type { Address } from 'viem';
import { Header } from '@/components/Header';
import { DepositPanel } from '@/components/DepositPanel';
import { useClub, navPerShare } from '@/lib/clubs';
import { stockByAddress } from '@/lib/addresses';
import { clubvaultAbi } from '@/lib/abis';
import { fmt, fmtCompact, short } from '@/lib/format';
import { explorerAddr, explorerTx } from '@/lib/chain';

/**
 * Validate before any data hook runs. Bailing out mid-component would change the number of
 * hooks between renders, which React treats as a crash.
 */
export default function ClubPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  if (!isAddress(address)) return <InvalidClub value={address} />;
  return <ClubBody v={address as Address} />;
}

function InvalidClub({ value }: { value: string }) {
  return (
    <>
      <Header />
      <div className="shell" style={{ padding: '110px 40px 130px', textAlign: 'center' }}>
        <div className="mono" style={{ fontSize: 12, letterSpacing: '0.18em', color: 'var(--dim)', marginBottom: 18 }}>
          NOT A CLUB
        </div>
        <h1 className="display h-1" style={{ margin: '0 0 16px', lineHeight: 1.05 }}>THAT IS NOT AN ADDRESS.</h1>
        <p style={{ fontSize: 17, color: 'var(--muted)', margin: '0 auto 30px', maxWidth: 460, wordBreak: 'break-all' }}>
          <span className="mono" style={{ fontSize: 14 }}>{value.slice(0, 60)}</span> is not a valid contract address.
        </p>
        <Link href="/clubs" className="btn btn-primary" style={{ display: 'inline-block' }}>BROWSE CLUBS</Link>
      </div>
    </>
  );
}

function ClubBody({ v }: { v: Address }) {
  const { address: user } = useAccount();
  const { club, pendingFees, position, isLoading, refetch } = useClub(v, user);
  const sym = club.assetSymbol ?? stockByAddress(club.asset)?.symbol ?? 'STOCK';
  const shareDec = club.shareDecimals;
  const nav = navPerShare(club.totalAssets, club.totalSupply, shareDec);

  const [err, setErr] = useState<string | null>(null);
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const bounty = pendingFees !== undefined && club.harvestBountyBps !== undefined
    ? (pendingFees * BigInt(club.harvestBountyBps)) / 10_000n
    : undefined;

  async function harvest() {
    setErr(null);
    try {
      await writeContractAsync({ address: v, abi: clubvaultAbi, functionName: 'harvest' });
      refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message.split('\n')[0].slice(0, 160) : 'Harvest failed');
    }
  }

  return (
    <>
      <Header />

      <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--line)' }}>
        <div className="shell" style={{ padding: '30px 40px 26px' }}>
          <div className="mono" style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 14 }}>
            <Link href="/clubs">Clubs</Link> / {sym} / <a href={explorerAddr(v)} target="_blank" rel="noreferrer">{short(v)}</a>
          </div>
          <div className="between" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 18 }}>
            <div className="row" style={{ gap: 18 }}>
              <div className="slab" style={{ width: 54, height: 54, background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="display" style={{ fontSize: 17, color: 'var(--bg)' }}>{sym.slice(0, 2)}</span>
              </div>
              <div>
                <div className="row" style={{ gap: 12, marginBottom: 5, flexWrap: 'wrap' }}>
                  <span className="display" style={{ fontSize: 30, letterSpacing: '0.03em' }}>
                    {club.name ?? (isLoading ? 'Loading…' : 'Club')}
                  </span>
                  {club.mascot && club.mascot !== '0x0000000000000000000000000000000000000000' && (
                    <a href={explorerAddr(club.mascot)} target="_blank" rel="noreferrer" className="chip mono"
                      style={{ background: 'var(--ember-wash)', border: '1px solid #FFD2BC', color: 'var(--ember-ink)', fontSize: 11, padding: '5px 10px' }}>
                      {short(club.mascot)}
                    </a>
                  )}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>
                  Opened by {short(club.creator)}. Creator takes {club.creatorFeeBps !== undefined ? (club.creatorFeeBps / 100).toFixed(1) : '—'}% of each harvest.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="shell grid-12" style={{ gap: 24, padding: '30px 40px 48px' }}>
        <div className="col-8" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="slab card" style={{ padding: '28px' }}>
            <div className="grid-3" style={{ gap: 24 }}>
              <Metric label="IN THE JAR" value={fmtCompact(club.totalAssets)} sub={sym} />
              <Metric label="PER SHARE" value={nav !== undefined ? fmt(nav, 18, 4) : '—'} sub={`${sym} per share`} />
              <Metric label="UNDRIPPED" value={fmt(club.lockedProfit, 18, 4)} sub="still releasing" subColor="var(--gain)" />
            </div>
          </div>

          <div className="slab card" style={{ padding: '26px 28px' }}>
            <div className="display" style={{ fontSize: 17, letterSpacing: '0.04em', marginBottom: 18 }}>HOW THIS CLUB WORKS</div>
            <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--muted)', margin: '0 0 14px' }}>
              The mascot is priced in {sym}, so its creator fees arrive as {sym} and go straight into this jar.
              Nothing is swapped, so there is no route, no oracle and no slippage between a trade and your slice.
            </p>
            <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--muted)', margin: 0 }}>
              Harvested fees do not land in one block. They release over 24 hours, which is why the undripped number
              above is not yet counted in the jar.
            </p>
          </div>
        </div>

        <div className="col-4" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {club.asset && (
            <DepositPanel
              vault={v}
              asset={club.asset}
              symbol={sym}
              walletBalance={position.walletBalance}
              shares={position.shares}
              redeemable={position.redeemable}
              exitFeeBps={club.exitFeeBps}
              shareDecimals={shareDec}
              assetPaused={position.assetPaused}
              onDone={refetch}
            />
          )}

          <div className="slab card" style={{ padding: 24 }}>
            <div className="label" style={{ marginBottom: 12 }}>YOUR POSITION</div>
            <div className="stat" style={{ fontSize: 30, marginBottom: 4 }}>{fmt(position.redeemable)}</div>
            <div className="mono" style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 18 }}>{sym} redeemable</div>
            <div style={{ height: 1, background: 'var(--line-soft)', marginBottom: 16 }} />
            <div className="stack" style={{ gap: 9, fontSize: 13 }}>
              <div className="between"><span style={{ color: 'var(--muted)' }}>Shares held</span><span className="mono">{fmt(position.shares, shareDec)}</span></div>
              <div className="between"><span style={{ color: 'var(--muted)' }}>In wallet</span><span className="mono">{fmt(position.walletBalance)} {sym}</span></div>
            </div>
          </div>

          <div className="slab" style={{ background: 'var(--ink)', padding: 24 }}>
            <div className="between" style={{ marginBottom: 14 }}>
              <span className="mono" style={{ fontSize: 11, letterSpacing: '0.13em', color: '#A79C90' }}>SITTING IN ESCROW</span>
              {pendingFees !== undefined && pendingFees > 0n && (
                <span className="chip mono" style={{ fontSize: 10, padding: '4px 8px', background: '#33291F', color: '#FF8A55' }}>CLAIMABLE</span>
              )}
            </div>
            <div className="stat" style={{ fontSize: 30, color: 'var(--bg)', marginBottom: 4 }}>{fmt(pendingFees)}</div>
            <div className="mono" style={{ fontSize: 12.5, color: '#A79C90', marginBottom: 18 }}>{sym} of mascot creator fees</div>
            <button className="btn btn-primary" style={{ width: '100%', padding: 14, textAlign: 'center', fontSize: 14 }}
              disabled={isPending || !pendingFees || pendingFees === 0n} onClick={harvest}>
              {isPending ? 'HARVESTING…' : pendingFees && pendingFees > 0n ? `HARVEST · KEEP ${fmt(bounty)}` : 'NOTHING TO HARVEST'}
            </button>
            <div style={{ fontSize: 11.5, color: '#A79C90', lineHeight: 1.6, marginTop: 12 }}>
              Anyone can call this. Whoever does keeps {club.harvestBountyBps !== undefined ? (club.harvestBountyBps / 100).toFixed(2) : '0.25'}%.
              The rest drips into the jar over the next 24 hours.
            </div>
            {hash && (
              <div style={{ fontSize: 11.5, marginTop: 10 }}>
                <a href={explorerTx(hash)} target="_blank" rel="noreferrer" style={{ color: '#FF8A55' }}>
                  {receipt.isLoading ? 'Confirming…' : 'View transaction'}
                </a>
              </div>
            )}
            {err && <div style={{ fontSize: 11.5, color: '#FF9A8A', marginTop: 10 }}>{err}</div>}
          </div>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value, sub, subColor }: { label: string; value: string; sub: string; subColor?: string }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 9 }}>{label}</div>
      <div className="stat" style={{ fontSize: 34 }}>{value}</div>
      <div className="mono" style={{ fontSize: 12.5, color: subColor ?? 'var(--muted)', marginTop: 3 }}>{sub}</div>
    </div>
  );
}
