'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress } from 'viem';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { Address } from 'viem';
import { Header } from '@/components/Header';
import { DepositPanel } from '@/components/DepositPanel';
import { useClub, navPerShare } from '@/lib/clubs';
import { stockByAddress } from '@/lib/addresses';
import { clubvaultAbi } from '@/lib/abis';
import { fmt, fmtCompact, short } from '@/lib/format';
import { explorerAddr, explorerTx } from '@/lib/chain';
import { useCorrectChain } from '@/lib/useCorrectChain';
import { useClubMeta, ponsTokenUrl } from '@/lib/clubMeta';
import { SetMascotImage } from '@/components/SetMascotImage';
import { useGraduation } from '@/lib/graduation';

/**
 * The club address comes from ?a= rather than a path segment, which keeps every route in
 * this app statically exportable. A path param would force a server render, since the set
 * of club addresses is not knowable at build time.
 */
export default function ClubPage() {
  return (
    <Suspense fallback={<Header />}>
      <ClubRoute />
    </Suspense>
  );
}

function ClubRoute() {
  const address = useSearchParams().get('a') ?? '';
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
          {value
            ? <><span className="mono" style={{ fontSize: 14 }}>{value.slice(0, 60)}</span> is not a valid contract address.</>
            : 'No club was specified.'}
        </p>
        <Link href="/clubs" className="btn btn-primary" style={{ display: 'inline-block' }}>BROWSE CLUBS</Link>
      </div>
    </>
  );
}

function ClubBody({ v }: { v: Address }) {
  const { address: user } = useAccount();
  const { wrongChain, switching, switchToPyro } = useCorrectChain();
  const { club, pendingFees, position, isLoading, refetch } = useClub(v, user);
  const sym = club.assetSymbol ?? stockByAddress(club.asset)?.symbol ?? 'STOCK';
  const meta = useClubMeta(v, club.creator);
  const grad = useGraduation(club.mascot, club.asset);
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
        <div className="shell" style={{ padding: '26px 40px 30px' }}>
          <div className="mono" style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 18 }}>
            <Link href="/clubs">Clubs</Link> / {sym} /{' '}
            <a href={explorerAddr(v)} target="_blank" rel="noreferrer">{short(v)}</a>
          </div>

          <div className="between stack-sm" style={{ alignItems: 'flex-end', gap: 24 }}>
            <div className="row" style={{ gap: 22, alignItems: 'center' }}>
              <div
                className="slab lift"
                style={{
                  width: 104, height: 104, flexShrink: 0,
                  border: '1px solid var(--line)',
                  background: meta?.logo
                    ? `center / cover no-repeat url("${meta.logo}")`
                    : 'var(--ink)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {!meta?.logo && (
                  <span className="display" style={{ fontSize: 30, color: 'var(--bg)' }}>
                    {(club.mascotSymbol ?? sym).slice(0, 2)}
                  </span>
                )}
              </div>

              <div>
                <div className="row" style={{ gap: 12, marginBottom: 7, flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <span className="display" style={{ fontSize: 34, letterSpacing: '0.03em' }}>
                    {club.mascotName?.trim() || club.name || 'Club'}
                  </span>
                  {club.mascotSymbol && (
                    <span className="display" style={{ fontSize: 22, color: 'var(--ember-ink)' }}>
                      ${club.mascotSymbol}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 520 }}>
                  {meta?.description?.trim()
                    || `A ${sym} club. Every trade of the mascot sends fees back to the jar as more ${sym}.`}
                </div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--dim)', marginTop: 7 }}>
                  opened by {short(club.creator)} · creator takes{' '}
                  {club.creatorFeeBps !== undefined ? (club.creatorFeeBps / 100).toFixed(1) : '—'}% of each harvest
                </div>
                <div style={{ marginTop: 12 }}>
                  <SetMascotImage vault={v} creator={club.creator} hasImage={Boolean(meta?.logo)} />
                </div>
              </div>
            </div>

            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              {meta?.twitter && (
                <a href={meta.twitter} target="_blank" rel="noreferrer noopener" className="btn btn-ghost"
                   style={{ display: 'inline-block', padding: '13px 18px', fontSize: 14, color: 'var(--ink)' }}>
                  X
                </a>
              )}
              {club.mascot && club.mascot !== '0x0000000000000000000000000000000000000000' && (
                <a href={ponsTokenUrl(club.mascot)} target="_blank" rel="noreferrer noopener"
                   className="btn btn-primary"
                   style={{ display: 'inline-block', padding: '15px 26px', fontSize: 15 }}>
                  BUY ${club.mascotSymbol ?? 'MASCOT'}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="shell grid-12" style={{ gap: 24, padding: '30px 40px 48px' }}>
        <div className="col-8" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="slab card" style={{ padding: '28px' }}>
            <div className="grid-3" style={{ gap: 24 }}>
              <Metric
                label="IN THE JAR" value={fmtCompact(club.totalAssets)} sub={sym}
                hint={`All the ${sym} this club is holding for its members.`}
              />
              <Metric
                label="PER SHARE" value={nav !== undefined ? fmt(nav, 18, 4) : '—'} sub={`${sym} per share`}
                hint="What one share is worth today. It only goes up, as fees arrive."
              />
              <Metric
                label="UNDRIPPED" value={fmt(club.lockedProfit, 18, 4)} sub="still releasing" subColor="var(--gain)"
                hint="Fees already collected, released into the jar over 24 hours so nobody can time it."
              />
            </div>
          </div>

          {grad && !grad.graduated && (
            <div className="slab card" style={{ padding: '26px 28px' }}>
              <div className="between" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
                <div className="display" style={{ fontSize: 17, letterSpacing: '0.04em' }}>
                  ${club.mascotSymbol ?? 'MASCOT'} HAS NOT GRADUATED YET
                </div>
                <span className="stat" style={{ fontSize: 19 }}>{(grad.progress * 100).toFixed(1)}%</span>
              </div>

              <div style={{ height: 8, background: 'var(--line-soft)', marginBottom: 12, position: 'relative' }}>
                <div style={{
                  position: 'absolute', inset: 0, right: `${100 - grad.progress * 100}%`,
                  background: 'var(--ember)', transition: 'right 0.6s var(--ease-out)',
                }} />
              </div>

              <div className="between mono" style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 16 }}>
                <span>{fmt(grad.raised, 18, 4)} {sym} bought</span>
                <span>{fmt(grad.needed, 18, 2)} {sym} to graduate</span>
              </div>

              <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--muted)', margin: 0 }}>
                While a mascot is still on its bonding curve, what buyers pay stays on the curve.
                Creator fees only start flowing to this jar once it graduates onto a pool. Until
                then the jar holds exactly what members put in, and nothing more.
              </p>
            </div>
          )}

          <div className="slab card lift" style={{ padding: '26px 28px' }}>
            <div className="between" style={{ marginBottom: 18, flexWrap: 'wrap', gap: 14 }}>
              <div className="display" style={{ fontSize: 17, letterSpacing: '0.04em' }}>
                THE MASCOT PAYS THE JAR
              </div>
              {club.mascot && club.mascot !== '0x0000000000000000000000000000000000000000' && (
                <a href={ponsTokenUrl(club.mascot)} target="_blank" rel="noreferrer noopener"
                   className="mono" style={{ fontSize: 12.5 }}>
                  trade ${club.mascotSymbol ?? 'mascot'} on Pons →
                </a>
              )}
            </div>
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
            <div className="mono" style={{ fontSize: 12.5, color: '#A79C90', marginBottom: 18 }}>
              {sym} of {club.mascotSymbol ? `$${club.mascotSymbol}` : 'mascot'} creator fees
            </div>
            <button className="btn btn-primary" style={{ width: '100%', padding: 14, textAlign: 'center', fontSize: 14 }}
              disabled={wrongChain ? switching : (isPending || !pendingFees || pendingFees === 0n)}
              onClick={wrongChain ? switchToPyro : harvest}>
              {wrongChain ? (switching ? 'CHECK YOUR WALLET…' : 'SWITCH NETWORK')
                : isPending ? 'HARVESTING…'
                : pendingFees && pendingFees > 0n ? `HARVEST · KEEP ${fmt(bounty)}` : 'NOTHING TO HARVEST'}
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

function Metric({ label, value, sub, subColor, hint }: {
  label: string; value: string; sub: string; subColor?: string; hint?: string;
}) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 9 }}>{label}</div>
      <div className="stat" style={{ fontSize: 34 }}>{value}</div>
      <div className="mono" style={{ fontSize: 12.5, color: subColor ?? 'var(--muted)', marginTop: 3 }}>{sub}</div>
      {hint && (
        <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 7, lineHeight: 1.5, maxWidth: 210 }}>
          {hint}
        </div>
      )}
    </div>
  );
}
