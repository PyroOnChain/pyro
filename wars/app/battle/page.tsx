'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { maxUint256, parseUnits, type Address } from 'viem';
import { useAccount, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Countdown } from '@/components/Countdown';
import { battleAbi, erc20Abi } from '@/lib/abi';
import { SIDE_A, SIDE_B, phaseOf, tugSplit, useBattle } from '@/lib/battles';
import { stockByAddress } from '@/lib/addresses';
import { fmt, short } from '@/lib/format';
import { explorerAddr, explorerTx } from '@/lib/chain';
import { useCorrectChain } from '@/lib/useCorrectChain';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BattlePage />
    </Suspense>
  );
}

function BattlePage() {
  const params = useSearchParams();
  const addr = params.get('a') as Address | null;
  const { address: me } = useAccount();
  const { wrongChain, switching, switchToVaultTube: switchChain } = useCorrectChain();

  const { battle, weightA, weightB, stockSymbol, refetch } = useBattle(addr ?? undefined);
  const [side, setSide] = useState<number>(SIDE_A);
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const stockMeta = stockByAddress(battle.stock);
  // prefer the curated name, fall back to whatever the token calls itself
  const sym = stockMeta?.symbol ?? stockSymbol ?? '—';
  const phase = phaseOf(battle);
  const [pa, pb] = tugSplit(battle.peakA, battle.peakB);

  // everything about the connected wallet's position, read together
  const { data: mine, refetch: refetchMine } = useReadContracts({
    contracts: addr && me && battle.stock
      ? ([
          { address: addr, abi: battleAbi, functionName: 'positions', args: [SIDE_A, me] },
          { address: addr, abi: battleAbi, functionName: 'positions', args: [SIDE_B, me] },
          { address: addr, abi: battleAbi, functionName: 'weightOf', args: [SIDE_A, me] },
          { address: addr, abi: battleAbi, functionName: 'weightOf', args: [SIDE_B, me] },
          { address: addr, abi: battleAbi, functionName: 'claimable', args: [SIDE_A, me] },
          { address: addr, abi: battleAbi, functionName: 'claimable', args: [SIDE_B, me] },
          { address: battle.stock, abi: erc20Abi, functionName: 'balanceOf', args: [me] },
          { address: battle.stock, abi: erc20Abi, functionName: 'allowance', args: [me, addr] },
        ] as const)
      : [],
    query: { enabled: Boolean(addr && me && battle.stock), refetchInterval: 8_000 },
  });

  const g = (i: number) => (mine?.[i]?.status === 'success' ? mine[i].result : undefined);
  const posA = g(0) as readonly [bigint, bigint, bigint, bigint] | undefined;
  const posB = g(1) as readonly [bigint, bigint, bigint, bigint] | undefined;
  const myWeightA = g(2) as bigint | undefined;
  const myWeightB = g(3) as bigint | undefined;
  const claimA = g(4) as bigint | undefined;
  const claimB = g(5) as bigint | undefined;
  const balance = g(6) as bigint | undefined;
  const allowance = g(7) as bigint | undefined;

  const myTokens = side === SIDE_A ? posA?.[0] : posB?.[0];
  const myWeight = side === SIDE_A ? myWeightA : myWeightB;
  const sideWeight = side === SIDE_A ? weightA : weightB;

  const sharePct = useMemo(() => {
    if (!myWeight || !sideWeight || sideWeight === 0n) return 0;
    return Number((myWeight * 10000n) / sideWeight) / 100;
  }, [myWeight, sideWeight]);

  const parsed = useMemo(() => {
    try { return amount ? parseUnits(amount, 18) : 0n; } catch { return 0n; }
  }, [amount]);

  const after = async () => { await Promise.all([refetch(), refetchMine()]); };

  async function enter() {
    if (!addr || parsed === 0n) return;
    setErr(null);
    try {
      if ((allowance ?? 0n) < parsed) {
        await writeContractAsync({ address: battle.stock as Address, abi: erc20Abi, functionName: 'approve', args: [addr, maxUint256] });
      }
      await writeContractAsync({ address: addr, abi: battleAbi, functionName: 'enter', args: [side, parsed, 0n] });
      setAmount('');
      await after();
    } catch (e) { setErr(cleanError(e)); }
  }

  async function act(fn: 'settle' | 'harvest' | 'poke') {
    if (!addr) return;
    setErr(null);
    try {
      await writeContractAsync({ address: addr, abi: battleAbi, functionName: fn });
      await after();
    } catch (e) { setErr(cleanError(e)); }
  }

  async function claimSide(s: number) {
    if (!addr) return;
    setErr(null);
    try {
      await writeContractAsync({ address: addr, abi: battleAbi, functionName: 'claim', args: [s] });
      await after();
    } catch (e) { setErr(cleanError(e)); }
  }

  async function withdrawAll(s: number) {
    if (!addr) return;
    const tokens = s === SIDE_A ? posA?.[0] : posB?.[0];
    if (!tokens || tokens === 0n) return;
    setErr(null);
    try {
      await writeContractAsync({ address: addr, abi: battleAbi, functionName: 'withdraw', args: [s, tokens] });
      await after();
    } catch (e) { setErr(cleanError(e)); }
  }

  if (!addr) {
    return (
      <>
        <Header />
        <div className="shell" style={{ padding: '90px 36px', textAlign: 'center' }}>
          <div className="display h-2" style={{ marginBottom: 14 }}>NO FIGHT SELECTED</div>
          <Link href="/battles" className="btn btn-gold">See the fights</Link>
        </div>
        <Footer />
      </>
    );
  }

  const winA = battle.winner === 1;
  const winB = battle.winner === 2;
  const busy = isPending || receipt.isLoading;

  return (
    <>
      <Header />

      {/* ------------------------------------------------------------ banner */}
      <div style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
        <div className="shell" style={{ padding: '22px 36px 26px' }}>
          <div className="mono" style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 18 }}>
            <Link href="/battles" style={{ color: 'var(--muted)' }}>Fights</Link> / {sym} /{' '}
            <a href={explorerAddr(addr)} target="_blank" rel="noreferrer" style={{ color: 'var(--muted)' }}>{short(addr)}</a>
          </div>

          <div className="between" style={{ marginBottom: 22, flexWrap: 'wrap', gap: 14 }}>
            {phase === 'live' && <span className="chip chip-live"><span className="pulse-dot">●</span> LIVE</span>}
            {phase === 'awaiting' && <span className="chip chip-gold">CLOCK STOPPED · NEEDS SETTLING</span>}
            {phase === 'settled' && (
              <span className={`chip ${winA ? 'chip-red' : winB ? 'chip-blue' : 'chip-gold'}`}>
                {winA ? 'SIDE A TOOK IT' : winB ? 'SIDE B TOOK IT' : 'DRAW · BOTH SIDES PAID'}
              </span>
            )}
            <div className="display" style={{ fontSize: 34, color: phase === 'live' ? 'var(--gold)' : 'var(--muted)' }}>
              <Countdown endAt={battle.endAt} />
            </div>
          </div>

          <div className="versus" style={{ marginBottom: 20 }}>
            <Corner side="a" name={battle.nameA} sym={battle.symbolA} peak={battle.peakA} won={winA} settled={battle.settled} />
            <div className="vs"><span>VS</span></div>
            <Corner side="b" name={battle.nameB} sym={battle.symbolB} peak={battle.peakB} won={winB} settled={battle.settled} align="right" />
          </div>

          <div className="tug" style={{ marginBottom: 8 }}>
            <div className="tug-a" style={{ width: `${pa}%` }} />
            <div className="tug-b" style={{ width: `${pb}%` }} />
          </div>
          <div className="between mono" style={{ fontSize: 12, color: 'var(--dim)' }}>
            <span style={{ color: 'var(--red)' }}>{pa.toFixed(1)}%</span>
            <span>PEAK MARKET CAP · THE HIGH WATER MARK, NOT THE CLOSE</span>
            <span style={{ color: 'var(--blue)' }}>{pb.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ stats */}
      <div className="shell" style={{ padding: '24px 36px 0' }}>
        <div className="statbar plate">
          <Stat label="PURSE COLLECTED" value={`${fmt(battle.totalHarvested, 18, 4)} ${sym}`} gold />
          <Stat label="BACKING SIDE A" value={fmt(weightA, 18, 0)} note="token-seconds" />
          <Stat label="BACKING SIDE B" value={fmt(weightB, 18, 0)} note="token-seconds" />
          <Stat label="FIGHTING IN" value={sym} />
        </div>
      </div>

      <div className="shell grid-2" style={{ padding: '24px 36px 60px', gap: 22, alignItems: 'start' }}>
        {/* ---------------------------------------------------------- act */}
        <div className="panel plate" style={{ padding: '24px 24px 22px' }}>
          <div className="display" style={{ fontSize: 22, marginBottom: 6 }}>
            {phase === 'live' ? 'PICK A CORNER' : phase === 'awaiting' ? 'RING THE BELL' : 'COLLECT'}
          </div>
          <p style={{ fontSize: 14.5, color: 'var(--muted)', margin: '0 0 20px', lineHeight: 1.6 }}>
            {phase === 'live'
              ? 'Your stock buys that side’s coin and the arena holds it for you. How much you back and how long you hold both count.'
              : phase === 'awaiting'
                ? 'The clock has run out. Anyone can settle it and lock in the result.'
                : 'Fees are claimed from the launchpad into the purse, then split by how much each winner held and for how long.'}
          </p>

          {phase === 'live' && (
            <>
              <div className="grid-2" style={{ gap: 10, marginBottom: 18 }}>
                <button className={`btn ${side === SIDE_A ? 'btn-red' : 'btn-ghost'}`} onClick={() => setSide(SIDE_A)}>
                  {battle.symbolA ? `$${battle.symbolA}` : 'SIDE A'}
                </button>
                <button className={`btn ${side === SIDE_B ? 'btn-blue' : 'btn-ghost'}`} onClick={() => setSide(SIDE_B)}>
                  {battle.symbolB ? `$${battle.symbolB}` : 'SIDE B'}
                </button>
              </div>

              <div className="between" style={{ marginBottom: 8 }}>
                <span className="label">AMOUNT</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--dim)' }}>
                  Balance {fmt(balance, 18, 4)} {sym}
                </span>
              </div>
              <div className="panel-2" style={{ padding: '14px 16px', marginBottom: 16 }}>
                <div className="row" style={{ gap: 10 }}>
                  <input className="field-amount" inputMode="decimal" placeholder="0.00"
                    value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
                  <button className="chip" onClick={() => balance && setAmount(fmt(balance, 18, 6))}>MAX</button>
                  <span className="mono" style={{ fontSize: 14 }}>{sym}</span>
                </div>
              </div>

              {wrongChain ? (
                <button className="btn btn-gold" style={{ width: '100%' }} disabled={switching} onClick={switchChain}>
                  {switching ? 'Check your wallet…' : 'Switch network'}
                </button>
              ) : (
                <button className={`btn ${side === SIDE_A ? 'btn-red' : 'btn-blue'}`} style={{ width: '100%' }}
                  disabled={busy || parsed === 0n} onClick={enter}>
                  {busy ? 'Confirm in wallet…' : parsed === 0n ? 'Enter an amount' : `Back ${side === SIDE_A ? battle.symbolA ?? 'A' : battle.symbolB ?? 'B'}`}
                </button>
              )}

              <button className="btn btn-ghost" style={{ width: '100%', marginTop: 10, fontSize: 14, padding: '11px 18px' }}
                disabled={busy} onClick={() => act('poke')}>
                Record the current peak
              </button>
              <p style={{ fontSize: 12.5, color: 'var(--dim)', margin: '10px 0 0', lineHeight: 1.6 }}>
                Peaks are only recorded when someone touches the contract. If your side is spiking, poke it.
              </p>
            </>
          )}

          {phase === 'awaiting' && (
            <button className="btn btn-gold" style={{ width: '100%' }} disabled={busy} onClick={() => act('settle')}>
              {busy ? 'Confirm in wallet…' : 'Settle the fight'}
            </button>
          )}

          {phase === 'settled' && (
            <>
              <button className="btn btn-ghost" style={{ width: '100%', marginBottom: 10 }} disabled={busy} onClick={() => act('harvest')}>
                {busy ? 'Confirm in wallet…' : 'Pull fees into the purse'}
              </button>
              {[SIDE_A, SIDE_B].map((s) => {
                const c = s === SIDE_A ? claimA : claimB;
                if (!c || c === 0n) return null;
                return (
                  <button key={s} className={`btn ${s === SIDE_A ? 'btn-red' : 'btn-blue'}`} style={{ width: '100%', marginBottom: 10 }}
                    disabled={busy} onClick={() => claimSide(s)}>
                    Claim {fmt(c, 18, 4)} {sym}
                  </button>
                );
              })}
              {(claimA ?? 0n) === 0n && (claimB ?? 0n) === 0n && (
                <p style={{ fontSize: 13.5, color: 'var(--dim)', margin: 0 }}>
                  Nothing to claim yet. Fees arrive as the winning coin trades, so pull them in and check back.
                </p>
              )}
            </>
          )}

          {err && <div style={{ fontSize: 13, color: 'var(--loss)', marginTop: 12 }}>{err}</div>}
          {hash && (
            <div style={{ fontSize: 12.5, marginTop: 10 }}>
              <a href={explorerTx(hash)} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>
                {receipt.isLoading ? 'Confirming…' : 'View transaction'}
              </a>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------------- position */}
        <div className="panel plate" style={{ padding: '24px 24px 22px' }}>
          <div className="display" style={{ fontSize: 22, marginBottom: 18 }}>YOUR POSITION</div>

          {!me && <p style={{ color: 'var(--muted)', margin: 0 }}>Connect a wallet to see where you stand.</p>}

          {me && (
            <>
              {[SIDE_A, SIDE_B].map((s) => {
                const pos = s === SIDE_A ? posA : posB;
                const w = s === SIDE_A ? myWeightA : myWeightB;
                const tokens = pos?.[0] ?? 0n;
                if (tokens === 0n && (w ?? 0n) === 0n) return null;
                const c = s === SIDE_A ? 'var(--red)' : 'var(--blue)';
                const label = s === SIDE_A ? battle.symbolA : battle.symbolB;
                return (
                  <div key={s} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 16, marginBottom: 16 }}>
                    <div className="between" style={{ marginBottom: 10 }}>
                      <span className="display" style={{ fontSize: 17, color: c }}>${label ?? (s === SIDE_A ? 'A' : 'B')}</span>
                      {tokens > 0n && (
                        <button className="chip" disabled={busy} onClick={() => withdrawAll(s)}>WITHDRAW</button>
                      )}
                    </div>
                    <Row k="Coins held for you" v={fmt(tokens, 18, 2)} />
                    <Row k="Backing weight" v={fmt(w, 18, 0)} />
                    <Row k="Share of your side" v={`${(s === side ? sharePct : 0).toFixed(2)}%`} />
                  </div>
                );
              })}

              {(posA?.[0] ?? 0n) === 0n && (posB?.[0] ?? 0n) === 0n
                && (myWeightA ?? 0n) === 0n && (myWeightB ?? 0n) === 0n && (
                <p style={{ color: 'var(--muted)', margin: 0 }}>
                  You are not in this fight. Pick a corner while the clock is running.
                </p>
              )}

              <p style={{ fontSize: 12.5, color: 'var(--dim)', margin: '4px 0 0', lineHeight: 1.6 }}>
                Backing weight is coins multiplied by seconds held. It stops growing when you withdraw, and freezes
                completely at the bell.
              </p>
            </>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}

function Corner(p: {
  side: 'a' | 'b'; name?: string; sym?: string; peak?: bigint; won?: boolean; settled?: boolean; align?: 'right';
}) {
  const c = p.side === 'a' ? 'var(--red)' : 'var(--blue)';
  const dim = p.settled && !p.won;
  return (
    <div style={{ textAlign: p.align ?? 'left', opacity: dim ? 0.45 : 1 }}>
      <div className="label" style={{ color: c, marginBottom: 8 }}>
        {p.side === 'a' ? 'SIDE A' : 'SIDE B'}{p.won ? ' · WINNER' : ''}
      </div>
      <div className="display" style={{ fontSize: 30, lineHeight: 1.05, marginBottom: 4 }}>{p.name ?? '—'}</div>
      <div className="mono" style={{ fontSize: 14, color: c, marginBottom: 10 }}>${p.sym ?? '…'}</div>
      <div className="stat" style={{ fontSize: 22 }}>{fmt(p.peak, 18, 2)}</div>
    </div>
  );
}

function Stat({ label, value, note, gold }: { label: string; value: string; note?: string; gold?: boolean }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 8 }}>{label}</div>
      <div className="stat" style={{ fontSize: 21, color: gold ? 'var(--gold)' : 'var(--ink)' }}>{value}</div>
      {note && <div className="mono" style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>{note}</div>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="between" style={{ padding: '5px 0', fontSize: 13.5 }}>
      <span style={{ color: 'var(--muted)' }}>{k}</span>
      <span className="mono">{v}</span>
    </div>
  );
}

/** Wallet errors are enormous; show the first useful line. */
function cleanError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/User rejected|denied transaction/i.test(m)) return 'You rejected the transaction.';
  const short = m.split('\n')[0];
  return short.length > 160 ? `${short.slice(0, 160)}…` : short;
}
